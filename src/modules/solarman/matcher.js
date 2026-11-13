/**
 * @module solarman/matcher
 * @description Fuzzy name & location matcher linking app projects to Solarman Cloud stations.
 */

export function findSuggestedStationForProject(project, stations = []) {
  if (!stations || stations.length === 0) {
    return { suggested: null, confidence: 'none' };
  }
  if (stations.length === 1) {
    return { suggested: stations[0], confidence: 'single' };
  }
  if (!project) {
    return { suggested: null, confidence: 'none' };
  }

  const norm = str =>
    String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim();

  const projName = norm(project.name);
  const projLoc = norm(project.location);
  const projTokens = projName.split(/\s+/).filter(w => w.length >= 3 && !['planta', 'solar', 'proyecto', 'sistema'].includes(w));

  let bestStation = null;
  let bestScore = 0;

  for (const st of stations) {
    const stName = norm(st.name || st.stationName);
    const stAddr = norm(st.locationAddress || st.address || '');
    let score = 0;

    if (projName && stName && (stName.includes(projName) || projName.includes(stName))) {
      score += 50;
    }
    for (const tok of projTokens) {
      if (stName.includes(tok)) score += 20;
      if (stAddr.includes(tok)) score += 10;
    }
    if (projLoc && stAddr && (stAddr.includes(projLoc) || projLoc.includes(stAddr))) {
      score += 15;
    }
    const projCap = parseFloat(project.capacity_kw) || 0;
    const stCap = parseFloat(st.installedCapacity) || 0;
    if (projCap > 0 && stCap > 0 && Math.abs(projCap - stCap) <= 0.6) {
      score += 15;
    }

    if (score > bestScore) {
      bestScore = score;
      bestStation = st;
    }
  }

  if (bestScore >= 25 && bestStation) {
    return { suggested: bestStation, confidence: 'high' };
  }
  return { suggested: null, confidence: 'none' };
}

// ---------------------------------------------------------------------------
// Proxy API Calls (/api/solarman)
// ---------------------------------------------------------------------------
