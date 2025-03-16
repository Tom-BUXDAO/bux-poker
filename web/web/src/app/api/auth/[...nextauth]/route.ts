import NextAuth from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import { getPool } from '@/database/db';

const handler = NextAuth({
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'identify email guilds',
        },
      },
    }),
  ],
  secret: process.env.DISCORD_TOKEN?.split('.')[0],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'discord' && profile) {
        const pool = getPool();
        const avatarUrl = `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`;
        
        // Update or create user with Discord avatar URL
        await pool.query(`
          INSERT INTO users (id, username, discord_id, discord_avatar_url)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (discord_id) 
          DO UPDATE SET 
            username = EXCLUDED.username,
            discord_avatar_url = EXCLUDED.discord_avatar_url
        `, [crypto.randomUUID(), profile.username, profile.id, avatarUrl]);
      }
      return true;
    },
    async jwt({ token, profile }) {
      if (profile) {
        token.id = profile.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
});

export { handler as GET, handler as POST }; 