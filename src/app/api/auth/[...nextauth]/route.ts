import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface DiscordProfile {
  id: string;
  username: string;
  avatar: string | null;
  email?: string;
}

const handler = NextAuth({
  debug: true,
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        url: "https://discord.com/api/oauth2/authorize",
        params: {
          scope: "identify email guilds",
          redirect_uri: process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/api/auth/callback/discord` : "http://localhost:3000/api/auth/callback/discord"
        }
      }
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('SignIn callback:', { user, account, profile });
      if (account?.provider === 'discord' && profile) {
        const discordProfile = profile as DiscordProfile;
        try {
          // Create or update player record
          await prisma.player.upsert({
            where: { discordId: discordProfile.id },
            update: {
              discordUsername: discordProfile.username,
              avatarUrl: discordProfile.avatar ? `https://cdn.discordapp.com/avatars/${discordProfile.id}/${discordProfile.avatar}.png` : null,
            },
            create: {
              discordId: discordProfile.id,
              discordUsername: discordProfile.username,
              avatarUrl: discordProfile.avatar ? `https://cdn.discordapp.com/avatars/${discordProfile.id}/${discordProfile.avatar}.png` : null,
            },
          });
          return true;
        } catch (error) {
          console.error('Error creating/updating player:', error);
          return true; // Still allow sign in even if player creation fails
        }
      }
      return true;
    },
    async jwt({ token, account, profile }) {
      console.log('JWT callback:', { token, account, profile });
      if (account && profile) {
        const discordProfile = profile as DiscordProfile;
        token.accessToken = account.access_token;
        token.tokenType = account.token_type;
        token.id = discordProfile.id; // Add Discord ID to token
      }
      return token;
    },
    async session({ session, token }) {
      console.log('Session callback:', { session, token });
      if (session.user) {
        session.user.accessToken = token.accessToken as string;
        session.user.tokenType = token.tokenType as string;
        session.user.id = token.id as string; // Add Discord ID to session
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  useSecureCookies: true,
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
        domain: process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : undefined
      }
    }
  }
});

export { handler as GET, handler as POST }; 