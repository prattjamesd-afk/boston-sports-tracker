export default async function handler(req, res) {
  const TEAMS = [
    {
      name: 'Red Sox',
      league: 'baseball/mlb',
      id: 2,
      divisionName: 'AL East',
      standingsFormat: 'winpct',
      bostonAbbr: 'BOS',
      divisionAbbrs: ['BOS', 'BAL', 'NYY', 'TB', 'TOR']
    },
    {
      name: 'Celtics',
      league: 'basketball/nba',
      id: 2,
      divisionName: 'Atlantic Division',
      standingsFormat: 'winpct',
      bostonAbbr: 'BOS',
      divisionAbbrs: ['BOS', 'BKN', 'NY', 'NYK', 'PHI', 'TOR']
    },
    {
      name: 'Bruins',
      league: 'hockey/nhl',
      id: 1,
      divisionName: 'Atlantic Division',
      standingsFormat: 'nhl',
      bostonAbbr: 'BOS',
      divisionAbbrs: ['BOS', 'BUF', 'DET', 'FLA', 'MTL', 'OTT', 'TB', 'TOR']
    },
    {
      name: 'Patriots',
      league: 'football/nfl',
      id: 17,
      divisionName: 'AFC East',
      standingsFormat: 'winpct',
      bostonAbbr: 'NE',
      divisionAbbrs: ['NE', 'BUF', 'MIA', 'NYJ']
    }
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

      // Extract last 3 completed results across regular season and postseason
      const combinedEventsMap = new Map();
      for (const evt of [...(data.events || []), ...(events || [])]) {
        if (evt?.id) combinedEventsMap.set(evt.id, evt);
      }
      const completedEvents = Array.from(combinedEventsMap.values())
        .filter(evt => {
          const compStatus = evt?.competitions?.[0]?.status?.type || evt?.status?.type;
          return compStatus?.state === 'post' || compStatus?.completed === true;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      const recentResults = completedEvents.slice(-3).reverse().map(evt => {
        const comp = evt?.competitions?.[0];
        const competitors = comp?.competitors || [];
        const ourComp = competitors.find(
          c => String(c.id) === String(team.id) || String(c.team?.id) === String(team.id)
        );
        const oppComp = competitors.find(c => c !== ourComp);
        const ourScore = ourComp?.score?.displayValue ?? ourComp?.score ?? '';
        const oppScore = oppComp?.score?.displayValue ?? oppComp?.score ?? '';
        const ourAbbr = ourComp?.team?.abbreviation || team.bostonAbbr || 'BOS';
        const oppAbbr = oppComp?.team?.abbreviation || 'OPP';
        const oppName = oppComp?.team?.shortDisplayName || oppComp?.team?.displayName || 'Opponent';
        const isHome = ourComp?.homeAway === 'home';
        const statusDetail = comp?.status?.type?.shortDetail || evt?.status?.type?.shortDetail || 'Final';
        const isOvertime = /\b(OT|SO)\b/i.test(statusDetail);
        const outcome = ourComp?.winner ? 'W' : (team.name === 'Bruins' && isOvertime ? 'OTL' : 'L');

        return {
          id: evt.id,
          date: evt.date,
          matchupLabel: `${isHome ? 'vs' : '@'} ${oppName}`,
          scoreLabel: `${ourAbbr} ${ourScore} - ${oppAbbr} ${oppScore}`,
          outcome,
          statusDetail
        };
      });

      // Fetch Division Standings for each team
      let standings = null;
      try {
        const stRes = await fetch(`https://site.api.espn.com/apis/v2/sports/${team.league}/standings`);
        const stData = await stRes.json();
        const divAbbrs = new Set(team.divisionAbbrs || []);
        const allEntries = (stData.children || []).flatMap(conf => [
          ...(conf.standings?.entries || []),
          ...(conf.children || []).flatMap(div => div.standings?.entries || [])
        ]);
        const seen = new Set();
        const getStat = (entry, ...names) =>
          entry.stats?.find(s => names.includes(s.name) || names.includes(s.abbreviation));

        const filteredEntries = allEntries.filter(e => {
          const abbr = e?.team?.abbreviation;
          if (!abbr || !divAbbrs.has(abbr) || seen.has(abbr)) return false;
          seen.add(abbr);
          return true;
        });

        if (team.standingsFormat === 'nhl') {
          const rows = filteredEntries
            .map(e => ({
              team: e.team.shortDisplayName || e.team.name || e.team.displayName,
              abbr: e.team.abbreviation,
              gp: getStat(e, 'gamesPlayed', 'GP')?.displayValue || '0',
              w: getStat(e, 'wins', 'W')?.displayValue || '0',
              l: getStat(e, 'losses', 'L')?.displayValue || '0',
              otl: getStat(e, 'otLosses', 'overtimeLosses', 'OTL')?.displayValue || '0',
              pts: Number(getStat(e, 'points', 'PTS')?.value || 0),
              ptsDisplay: getStat(e, 'points', 'PTS')?.displayValue || '0',
              diff: getStat(e, 'pointDifferential', 'pointsDiff', 'DIFF')?.displayValue || '0',
              strk: getStat(e, 'streak', 'STRK')?.displayValue || '-',
              isBoston: e.team.abbreviation === team.bostonAbbr
            }))
            .sort((a, b) => b.pts - a.pts || Number(b.w) - Number(a.w))
            .map((row, idx) => ({ ...row, rank: idx + 1 }));

          standings = {
            divisionName: team.divisionName,
            format: 'nhl',
            rows
          };
        } else {
          const rawRows = filteredEntries
            .map(e => {
              const wStat = getStat(e, 'wins', 'W');
              const lStat = getStat(e, 'losses', 'L');
              const tStat = getStat(e, 'ties', 'T');
              const pctStat = getStat(e, 'winPercent', 'PCT');
              const diffStat = getStat(e, 'pointDifferential', 'pointsDiff', 'differential', 'DIFF');
              const strkStat = getStat(e, 'streak', 'STRK');

              const wVal = Number(wStat?.value || 0);
              const lVal = Number(lStat?.value || 0);
              const tVal = Number(tStat?.value || 0);
              const totalGames = wVal + lVal + tVal;
              const pctVal = Number(
                pctStat?.value ?? (totalGames > 0 ? (wVal + 0.5 * tVal) / totalGames : 0)
              );
              const pctDisplay = pctStat?.displayValue || pctVal.toFixed(3).replace(/^0/, '');

              const wStr = wStat?.displayValue ?? String(wVal);
              const lStr = lStat?.displayValue ?? String(lVal);
              const recordStr = tVal > 0 ? `${wStr}-${lStr}-${tVal}` : `${wStr}-${lStr}`;

              let diffDisplay = diffStat?.displayValue || '0';
              if (diffStat?.value > 0 && !String(diffDisplay).startsWith('+')) {
                diffDisplay = `+${diffDisplay}`;
              }

              return {
                team: e.team.shortDisplayName || e.team.name || e.team.displayName,
                abbr: e.team.abbreviation,
                wVal,
                lVal,
                tVal,
                record: recordStr,
                pctVal,
                pctDisplay,
                diff: diffDisplay,
                strk: strkStat?.displayValue || '-',
                isBoston: e.team.abbreviation === team.bostonAbbr
              };
            })
            .sort((a, b) => b.pctVal - a.pctVal || b.wVal - a.wVal || a.lVal - b.lVal);

          const leader = rawRows[0];
          const rows = rawRows.map((row, idx) => {
            let gb = '-';
            if (idx > 0 && leader) {
              const gbNum = ((leader.wVal - row.wVal) + (row.lVal - leader.lVal)) / 2;
              if (gbNum > 0) {
                gb = Number.isInteger(gbNum) ? String(gbNum) : gbNum.toFixed(1);
              }
            }
            return {
              ...row,
              gb,
              rank: idx + 1
            };
          });

          standings = {
            divisionName: team.divisionName,
            format: 'winpct',
            rows
          };
        }
      } catch (e) {
        console.error(`Failed to fetch ${team.name} standings:`, e);
      }

      return {
        team: team.name,
        record: data.team?.recordSummary || '0-0',
        standingSummary: data.team?.standingSummary || '',
        games: parsedGames,
        recentResults,
        standings
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
