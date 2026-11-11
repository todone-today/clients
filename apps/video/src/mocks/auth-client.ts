// The auth client, without a server: one signed-in person and, for the team scene, one team. Scenes switch the team
// on with setTeam() (it's read on each render, so a frame shows whatever was set for it).
export const ME = { id: "u_asha", name: "Asha", email: "asha@todone.today", image: null, emailVerified: true, createdAt: new Date("2026-01-05") };
const MEMBERS = [
  { id: "m1", role: "owner", userId: ME.id, user: { ...ME } },
  { id: "m2", role: "member", userId: "u_kabir", user: { id: "u_kabir", name: "Kabir", email: "kabir@todone.today", image: null } },
  { id: "m3", role: "member", userId: "u_meera", user: { id: "u_meera", name: "Meera", email: "meera@todone.today", image: null } },
];
let team: { invited: string[]; members: number } | null = null;
// Set by a scene while it renders (every frame re-renders the scene and the real components under it).
export function setTeam(t: typeof team) {
  team = t;
}

const organization = () => {
  const t = team;
  if (!t) return null;
  return {
    id: "o_home",
    name: "Home",
    slug: "home",
    members: MEMBERS.slice(0, t.members),
    invitations: t.invited.map((email, i) => ({ id: `i${i}`, email, role: "member", status: "pending" })),
  };
};
const ok = async () => ({ data: null, error: null });

export const authClient = {
  useSession: () => {
    return {
      data: { user: ME, session: { id: "s1", activeOrganizationId: team ? "o_home" : null, createdAt: new Date() } },
      isPending: false,
      error: null,
    };
  },
  useListOrganizations: () => ({ data: team ? [{ id: "o_home", name: "Home", slug: "home" }] : [], isPending: false }),
  useActiveOrganization: () => {
    return { data: organization(), isPending: false, refetch: () => {} };
  },
  useActiveMember: () => {
    return { data: team ? MEMBERS[0] : null, isPending: false };
  },
  organization: {
    create: ok,
    delete: ok,
    update: ok,
    leave: ok,
    setActive: ok,
    inviteMember: ok,
    removeMember: ok,
    cancelInvitation: ok,
  },
  signOut: ok,
  signIn: { social: ok, email: ok },
  signUp: { email: ok },
  listAccounts: async () => ({ data: [{ providerId: "credential" }] }),
};
