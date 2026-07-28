import { Instagram, Linkedin, XTwitter } from '../../components/BrandIcons';
import { Video } from 'lucide-react';

export const platforms = [
  { id: 'instagram_carousel', label: 'Instagram Carousel', Icon: Instagram, desc: 'Generate scroll-stopping carousel slides', gradient: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', accent: '#ec4899' },
  { id: 'linkedin_post',      label: 'LinkedIn Post',      Icon: Linkedin,  desc: 'Craft a professional thought leadership post',  gradient: 'linear-gradient(135deg,#0077B5,#00a0dc)',                accent: '#60a5fa' },
  { id: 'twitter_thread',     label: 'Twitter Thread',     Icon: XTwitter,  desc: 'Write a viral thread with engagement hooks',    gradient: 'linear-gradient(135deg,#1DA1F2,#0d8ecf)',                accent: '#22d3ee' },
  { id: 'instagram_caption',  label: 'Instagram Caption',  Icon: Instagram, desc: 'Create an engaging caption with emojis',    gradient: 'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)',        accent: '#a78bfa' },
  { id: 'video_script',       label: 'Video Script',       Icon: Video,     desc: 'Script for Reels, TikTok, or Shorts', gradient: 'linear-gradient(135deg,#FF0050,#FF4081)',                accent: '#f43f5e' },
];

export function findPlatform(id: string) {
  return platforms.find((p) => p.id === id);
}
