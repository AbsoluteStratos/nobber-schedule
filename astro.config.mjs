import icon from 'astro-icon';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://schedule.nobbers.tv/',
  base: '/',
  output: 'static',
  integrations: [
    icon({
      include: {
        'fa6-solid': ['shop'],
      },
    }),
  ],
});
