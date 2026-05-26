/** Locked palette — source: mockup/union-yoga-mockup.html */
export const brand = {
  cream: "#F4EFE6",
  creamSoft: "#EFE7D8",
  sand: "#E8DFC9",
  ink: "#1F2A22",
  forest: "#2E4034",
  forestDeep: "#1F2A22",
  moss: "#5C7060",
  clay: "#B5764B",
  claySoft: "#D9A47A",
  terra: "#8C4A2A",
  studioAnniversary: new Date("2025-01-03T00:00:00-05:00"),
  location: {
    name: "Powell, OH",
    lat: 40.158,
    lon: -83.075,
  },
} as const;

export const milestones = [10, 25, 50, 100, 250, 500, 1000] as const;
