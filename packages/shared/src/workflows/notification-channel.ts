import { z } from 'zod';

/** Mirrors the Prisma enum `NotificationChannel`. Teams and DingTalk are HuiTong mocks. */
export const NOTIFICATION_CHANNELS = ['IN_APP', 'TEAMS', 'DINGTALK', 'EMAIL'] as const;

export const notificationChannelSchema = z.enum(NOTIFICATION_CHANNELS);

export type NotificationChannel = z.infer<typeof notificationChannelSchema>;
