export default async function handler(req, res) {
  const TEAMS = [
    { name: 'Red Sox', league: 'baseball/mlb', id: 2 },
    { name: 'Celtics', league: 'basketball/nba', id: 2 },
    { name: 'Bruins', league: 'hockey/nhl', id: 1 },
    { name: 'Patriots', league: 'football/nfl', id: 17 }
  ];

  // Helper to extract all broadcast network names across national and regional feeds
  function extractBroadcastNames(broadcastArray) {
    if (!Array.isArray(broadcastArray) || broadcastArray.length === 0) return [];
    const names = [];
    for (const b of broadcastArray) {
      if (!b || typeof b !== 'object') continue;
      if (Array.isArray(b.names)) {
        names.push(...b.names);
      }
      if (b.name) {
        names.push(b.name);
      }
      if (b.media?.shortName) {
        names.push(b.media.shortName);
      }
    }
    // Return unique non-empty names
    return [...new Set(names.filter(name => typeof name === 'string' && name.trim()))];
  }

  // Prioritize regional sports networks (NESN, NESN+, NBCSB) for local viewers
  function prioritizeLocalBroadcast(networks, teamName, isPostseasonRedSox = false) {
    const validNetworks = Array.isArray(networks)
      ? networks.filter(network => typeof network === 'string' && network.trim())
      : [];

    if (teamName === 'Celtics') {
      // 1. Confirmed NBC Sports Boston from the API
      const nbcsb = validNetworks.find(n => /NBC\s*SPORTS\s*BOSTON|NBCSB/i.test(n));
      if (nbcsb) return 'NBC Sports Boston';

      // 2. Confirmed national broadcast (when NBCSB isn't explicitly listed)
      const national = validNetworks.filter(n =>
        /^(ABC|ESPN|ESPN2|TNT|TBS|NBC|NBCSN|PEACOCK|PRIME VIDEO|NBA TV)$/i.test(n.trim())
      );
      if (national.length > 0) return national.join(', ');

      // 3. Otherwise (empty array, NBA League Pass, or only opponent regional feeds), assume NBCSB*
      return 'NBC Sports Boston*';
    }

    if (validNetworks.length === 0) return 'TBD';

    // Check explicitly for verified NESN / NESN+ assignments
    const nesnPlus = validNetworks.find(n => n.toUpperCase().includes('NESN+'));
    if (nesnPlus) return 'NESN+';

    const nesn = validNetworks.find(n => n.toUpperCase().includes('NESN'));
    if (nesn) return 'NESN';

    const nbcsb = validNetworks.find(n => n.toUpperCase().includes('NBC SPORTS BOSTON') || n.toUpperCase().includes('NBCSB'));
    if (nbcsb) return 'NBC Sports Boston';

    // If no RSN found, return the full confirmed list (e.g. ESPN, TNT, ABC, CBS)
    return validNetworks.join(', ');
  }

  try {
    const fetchPromises = TEAMS.map(async (team) => {
      const baseUrl = `https://site.api.espn.com/apis/site/v2/sports/${team.league}/teams/${team.id}/schedule`;
      let response = await fetch(baseUrl);
      let data = await response.json();

      const now = new Date();
      let events = data.events || [];
      let upcoming = events.filter(evt => {
        const state = evt?.status?.type?.state || evt?.competitions?.[0]?.status?.type?.state;
        return state === 'in' || new Date(evt.date) >= now;
      });

      let isPostseason = false;

      // Postseason check if regular season is complete
      if (upcoming.length === 0) {
        const postRes = await fetch(`${baseUrl}?seasontype=3`);
        const postData = await postRes.json();
        const postEvents = postData.events || [];
        const upcomingPost = postEvents.filter(evt => new Date(evt.date) >= now);

        if (upcomingPost.length > 0) {
          upcoming = upcomingPost;
          isPostseason = true;
        } else if (postEvents.length > 0) {
          events = postEvents;
          isPostseason = true;
        }
      }

      // Slice the next 5 games
      const targetEvents = upcoming.length > 0 
        ? upcoming.slice(0, 5) 
        : (events.length > 0 ? [events[events.length - 1]] : []);

      const parsedGames = await Promise.all(targetEvents.map(async (evt) => {
        let networks = [];

        // 1. Check all broadcasts on the schedule event
        const scheduleBroadcasts = evt?.competitions?.[0]?.broadcasts;
        if (scheduleBroadcasts) {
          networks.push(...extractBroadcastNames(scheduleBroadcasts));
        }

        // 2. Query event summary endpoint for deeper broadcast listings (regional feeds)
        if (evt?.id) {
          try {
            const sumRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${team.league}/summary?event=${evt.id}`);
            const sumData = await sumRes.json();
            const sumBroadcasts = sumData?.header?.competitions?.[0]?.broadcasts;
            if (sumBroadcasts) {
              networks.push(...extractBroadcastNames(sumBroadcasts));
            }
          } catch (e) {
            // Keep existing networks on summary error
          }
        }

        // Remove duplicates
        networks = [...new Set(networks)];

        console.log(`Raw API networks for ${team.name}:`, networks);

        // Resolve exact broadcast label based on confirmed API data
        const finalBroadcast = prioritizeLocalBroadcast(
          networks, 
          team.name,
          team.name === 'Red Sox' && isPostseason
        );

               const gameState = evt?.status?.type?.state || evt?.competitions?.[0]?.status?.type?.state || 'pre';

        return {
          id: evt.id,
          team: team.name,
          gameName: evt.name,
          date: evt.date,
          broadcast: finalBroadcast,
          status: gameState
        };

      }));

      return {
        team: team.name,
      record: data.team?.recordSummary || '0-0',
      games: parsedGames
      };
    });

    const settled = await Promise.allSettled(fetchPromises);
    const results = settled.map((outcome, i) => {
      if (outcome.status === 'fulfilled') return outcome.value;
      console.error(`Failed to load ${TEAMS[i].name}:`, outcome.reason);
      return { team: TEAMS[i].name, record: null, games: [], failed: true };
    });

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120, max-age=0, must-revalidate, no-cache');

    res.status(200).json(results);

  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch schedule data' });
  }
}
