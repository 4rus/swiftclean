// ─────────────────────────────────────────────────────────────────────
// SwiftClean — INDIMOE Cleaning Store Locations
// Real GPS coordinates from Google Maps
// ─────────────────────────────────────────────────────────────────────

export const GPS_RADIUS_METRES = 200

export const STORES = [
  { id: 1, name: 'Swiss Chalet - Country Hills', address: '508 Country Village Way NE, Calgary, AB T3K 0R2',       lat: 51.15547962403082,  lng: -114.06045633856486 },
  { id: 2, name: 'Bahubali',                     address: '6520 36 St NE Unit - 1120, Calgary, AB T3J 4C8',        lat: 51.110903357884574, lng: -113.98118987414938 },
  { id: 3, name: 'Explode The Dessert Cafe',     address: '4715 88 Ave NE #1105, Calgary, AB T3J 4E4',             lat: 51.132182792486645, lng: -113.96528790434027 },
  { id: 4, name: 'Mumbaayai Pure Veg',           address: '4100 109 Ave NE unit 3120, Calgary, AB T3N 2J1',        lat: 51.15361165528103,  lng: -113.97560920298321 },
  { id: 5, name: 'Lovely Sweet - Savanna',       address: '30 Savanna Cres NE #1110, Calgary, AB T3J 2E9',         lat: 51.13285411491811,  lng: -113.94799040089555 },
  { id: 6, name: 'Lovely Sweet - Skyview',       address: '6004 Country Hills Blvd NE #1860, Calgary, AB T3N 1K8', lat: 51.15609853398679,  lng: -113.95048636065593 },
  { id: 7, name: 'Lovely Sweet - Redstone',      address: '235 Red Embers Way NE #3110, Calgary, AB T3N 1E9',      lat: 51.16602742095543,  lng: -113.95711206065533 },
]

// Haversine formula — returns distance in metres between two GPS points
export function getDistanceMetres(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const toRad = d => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Returns nearest store within radius, or tooFar result
export function getNearestStore(userLat, userLng) {
  let nearest = null
  let minDist = Infinity
  for (const store of STORES) {
    const dist = getDistanceMetres(userLat, userLng, store.lat, store.lng)
    if (dist < minDist) {
      minDist = dist
      nearest = { ...store, distance: Math.round(dist) }
    }
  }
  if (minDist <= GPS_RADIUS_METRES) return nearest
  return { nearest, distance: Math.round(minDist), tooFar: true }
}
