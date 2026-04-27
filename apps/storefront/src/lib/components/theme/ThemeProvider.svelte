<script lang="ts">
  import { resolveTheme, themeToCssVars, type ThemeType } from '@repo/ui/themes';

  interface Props {
    themeType: ThemeType;
    overrides?: Partial<{
      primary: string;
      secondary: string;
      accent: string;
      bg: string;
      surface: string;
      text: string;
      textSecondary: string;
      border: string;
      fontFamily: string;
      borderRadius: number;
    }>;
    children: import('svelte').Snippet;
  }

  let { themeType, overrides, children }: Props = $props();

  let cssVars = $derived(themeToCssVars(resolveTheme(themeType, overrides)));

  let styleStr = $derived(
    Object.entries(cssVars).map(([k, v]) => `${k}:${v}`).join(';')
  );
</script>

<div
  style={styleStr}
  class="min-h-screen"
>
  {@render children()}
</div>