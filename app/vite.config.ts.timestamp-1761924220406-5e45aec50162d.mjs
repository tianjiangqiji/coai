// vite.config.ts
import { defineConfig } from "file:///D:/Sky/program/js%20web/coai/app/node_modules/.pnpm/vite@4.5.0_@types+node@20.8.9_less@4.2.0_terser@5.34.1/node_modules/vite/dist/node/index.js";
import react from "file:///D:/Sky/program/js%20web/coai/app/node_modules/.pnpm/@vitejs+plugin-react-swc@3._f88832866bc3c44188e3197d9c8c5a31/node_modules/@vitejs/plugin-react-swc/index.mjs";
import path3 from "path";
import { createHtmlPlugin } from "file:///D:/Sky/program/js%20web/coai/app/node_modules/.pnpm/vite-plugin-html@3.2.0_vite_02d090fcbc4008576f68300ce1c8d855/node_modules/vite-plugin-html/dist/index.mjs";

// src/translator/translator.ts
import path2 from "path";
import fs2 from "fs";

// src/translator/io.ts
import fs from "fs";
import path from "path";
function readJSON(...paths) {
  return JSON.parse(fs.readFileSync(path.resolve(...paths)).toString());
}
function writeJSON(data, ...paths) {
  fs.writeFileSync(path.resolve(...paths), JSON.stringify(data, null, 2));
}
function getMigration(mother, data, prefix) {
  return Object.keys(mother).map((key) => {
    const template = mother[key], translation = data !== void 0 && key in data ? data[key] : void 0;
    const val = [prefix.length === 0 ? key : `${prefix}.${key}`];
    switch (typeof template) {
      case "string":
        if (typeof translation !== "string")
          return val;
        else if (template.startsWith("!!"))
          return val;
        break;
      case "object":
        return getMigration(template, translation, val[0]);
      default:
        return typeof translation === typeof template ? [] : val;
    }
    return [];
  }).flat().filter((key) => key !== void 0 && key.length > 0);
}
function getFields(data) {
  switch (typeof data) {
    case "string":
      return 1;
    case "object":
      if (Array.isArray(data))
        return data.length;
      return Object.keys(data).reduce(
        (acc, key) => acc + getFields(data[key]),
        0
      );
    default:
      return 1;
  }
}
function getTranslation(data, path4) {
  const keys = path4.split(".");
  let current = data;
  for (const key of keys) {
    if (current[key] === void 0)
      return void 0;
    current = current[key];
  }
  return current;
}
function setTranslation(data, path4, value) {
  const keys = path4.split(".");
  let current = data;
  for (let i = 0; i < keys.length - 1; i++) {
    if (current[keys[i]] === void 0)
      current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

// src/translator/adapter.ts
var languageTranslatorMap = {
  cn: "zh-CN",
  tw: "zh-TW",
  en: "en",
  ru: "ru",
  ja: "ja",
  ko: "ko",
  fr: "fr",
  de: "de",
  es: "es",
  pt: "pt",
  it: "it"
};
function getFormattedLanguage(lang) {
  return languageTranslatorMap[lang.toLowerCase()] || lang;
}
async function translate(text, from, to) {
  if (from === to || text.length === 0)
    return text;
  const resp = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text
    )}&langpair=${from}|${to}`
  );
  const data = await resp.json();
  return data.responseData.translatedText;
}
function doTranslate(content, from, to) {
  from = getFormattedLanguage(from);
  to = getFormattedLanguage(to);
  if (content.startsWith("!!"))
    content = content.substring(2);
  return translate(content, from, to);
}

// src/translator/translator.ts
var defaultDevLang = "cn";
async function processTranslation(config) {
  const source = path2.resolve(config.root, "src/resources/i18n");
  const files = fs2.readdirSync(source);
  const motherboard = `${defaultDevLang}.json`;
  if (files.length === 0) {
    console.warn("no translation files found");
    return;
  } else if (!files.includes(motherboard)) {
    console.warn(`no default translation file found (${defaultDevLang}.json)`);
    return;
  }
  const data = readJSON(source, motherboard);
  const target = files.filter((file) => file !== motherboard);
  for (const file of target) {
    const lang = file.split(".")[0];
    const translation = { ...readJSON(source, file) };
    const fields = getFields(data);
    const migration = getMigration(data, translation, "");
    const total = migration.length;
    let current = 0;
    for (const key of migration) {
      const from = getTranslation(data, key);
      const to = typeof from === "string" ? await doTranslate(from, defaultDevLang, lang) : from;
      current++;
      console.log(
        `[i18n] successfully translated: ${from} -> ${to} (lang: ${defaultDevLang} -> ${lang}, progress: ${current}/${total})`
      );
      setTranslation(translation, key, to);
    }
    if (migration.length > 0) {
      writeJSON(translation, source, file);
    }
    console.info(
      `translation file ${file} loaded, ${fields} fields detected, ${migration.length} migration(s) applied`
    );
  }
}

// src/translator/index.ts
function createTranslationPlugin() {
  return {
    name: "translate-plugin",
    apply: "build",
    async configResolved(config) {
      try {
        console.info("[i18n] start translation process");
        await processTranslation(config);
      } catch (e) {
        console.warn(`error during translation: ${e}`);
      } finally {
        console.info("[i18n] translation process finished");
      }
    }
  };
}

// vite.config.ts
var __vite_injected_original_dirname = "D:\\Sky\\program\\js web\\coai\\app";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    createHtmlPlugin({
      minify: true
    }),
    createTranslationPlugin()
  ],
  resolve: {
    alias: {
      "@": path3.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true
      }
    }
  },
  build: {
    manifest: true,
    chunkSizeWarningLimit: 2048,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`
      }
    }
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8094",
        changeOrigin: true,
        rewrite: (path4) => path4.replace(/^\/api/, ""),
        ws: true
      },
      "/v1": {
        target: "http://localhost:8094",
        changeOrigin: true
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAic3JjL3RyYW5zbGF0b3IvdHJhbnNsYXRvci50cyIsICJzcmMvdHJhbnNsYXRvci9pby50cyIsICJzcmMvdHJhbnNsYXRvci9hZGFwdGVyLnRzIiwgInNyYy90cmFuc2xhdG9yL2luZGV4LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiRDpcXFxcU2t5XFxcXHByb2dyYW1cXFxcanMgd2ViXFxcXGNvYWlcXFxcYXBwXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxTa3lcXFxccHJvZ3JhbVxcXFxqcyB3ZWJcXFxcY29haVxcXFxhcHBcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L1NreS9wcm9ncmFtL2pzJTIwd2ViL2NvYWkvYXBwL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2MnXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiXG5pbXBvcnQgeyBjcmVhdGVIdG1sUGx1Z2luIH0gZnJvbSAndml0ZS1wbHVnaW4taHRtbCcgLy9AdHMtaWdub3JlXG5pbXBvcnQgeyBjcmVhdGVUcmFuc2xhdGlvblBsdWdpbiB9IGZyb20gXCIuL3NyYy90cmFuc2xhdG9yXCJcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIGNyZWF0ZUh0bWxQbHVnaW4oe1xuICAgICAgbWluaWZ5OiB0cnVlLFxuICAgIH0pLFxuICAgIGNyZWF0ZVRyYW5zbGF0aW9uUGx1Z2luKCksXG4gIF0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfSxcbiAgfSxcbiAgY3NzOiB7XG4gICAgcHJlcHJvY2Vzc29yT3B0aW9uczoge1xuICAgICAgbGVzczoge1xuICAgICAgICBqYXZhc2NyaXB0RW5hYmxlZDogdHJ1ZSxcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgbWFuaWZlc3Q6IHRydWUsXG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAyMDQ4LFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBlbnRyeUZpbGVOYW1lczogYGFzc2V0cy9bbmFtZV0uW2hhc2hdLmpzYCxcbiAgICAgICAgY2h1bmtGaWxlTmFtZXM6IGBhc3NldHMvW25hbWVdLltoYXNoXS5qc2AsXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHByb3h5OiB7XG4gICAgICBcIi9hcGlcIjoge1xuICAgICAgICB0YXJnZXQ6IFwiaHR0cDovL2xvY2FsaG9zdDo4MDk0XCIsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL2FwaS8sIFwiXCIpLFxuICAgICAgICB3czogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBcIi92MVwiOiB7XG4gICAgICAgIHRhcmdldDogXCJodHRwOi8vbG9jYWxob3N0OjgwOTRcIixcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgfVxuICAgIH1cbiAgfVxufSk7XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkQ6XFxcXFNreVxcXFxwcm9ncmFtXFxcXGpzIHdlYlxcXFxjb2FpXFxcXGFwcFxcXFxzcmNcXFxcdHJhbnNsYXRvclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcU2t5XFxcXHByb2dyYW1cXFxcanMgd2ViXFxcXGNvYWlcXFxcYXBwXFxcXHNyY1xcXFx0cmFuc2xhdG9yXFxcXHRyYW5zbGF0b3IudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L1NreS9wcm9ncmFtL2pzJTIwd2ViL2NvYWkvYXBwL3NyYy90cmFuc2xhdG9yL3RyYW5zbGF0b3IudHNcIjtpbXBvcnQgeyBSZXNvbHZlZENvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IGZzIGZyb20gXCJmc1wiO1xuaW1wb3J0IHtcbiAgZ2V0RmllbGRzLFxuICBnZXRNaWdyYXRpb24sXG4gIGdldFRyYW5zbGF0aW9uLFxuICByZWFkSlNPTixcbiAgc2V0VHJhbnNsYXRpb24sXG4gIHdyaXRlSlNPTixcbn0gZnJvbSBcIi4vaW9cIjtcbmltcG9ydCB7IGRvVHJhbnNsYXRlIH0gZnJvbSBcIi4vYWRhcHRlclwiO1xuXG5leHBvcnQgY29uc3QgZGVmYXVsdERldkxhbmcgPSBcImNuXCI7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwcm9jZXNzVHJhbnNsYXRpb24oXG4gIGNvbmZpZzogUmVzb2x2ZWRDb25maWcsXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3Qgc291cmNlID0gcGF0aC5yZXNvbHZlKGNvbmZpZy5yb290LCBcInNyYy9yZXNvdXJjZXMvaTE4blwiKTtcbiAgY29uc3QgZmlsZXMgPSBmcy5yZWFkZGlyU3luYyhzb3VyY2UpO1xuXG4gIGNvbnN0IG1vdGhlcmJvYXJkID0gYCR7ZGVmYXVsdERldkxhbmd9Lmpzb25gO1xuXG4gIGlmIChmaWxlcy5sZW5ndGggPT09IDApIHtcbiAgICBjb25zb2xlLndhcm4oXCJubyB0cmFuc2xhdGlvbiBmaWxlcyBmb3VuZFwiKTtcbiAgICByZXR1cm47XG4gIH0gZWxzZSBpZiAoIWZpbGVzLmluY2x1ZGVzKG1vdGhlcmJvYXJkKSkge1xuICAgIGNvbnNvbGUud2Fybihgbm8gZGVmYXVsdCB0cmFuc2xhdGlvbiBmaWxlIGZvdW5kICgke2RlZmF1bHREZXZMYW5nfS5qc29uKWApO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGRhdGEgPSByZWFkSlNPTihzb3VyY2UsIG1vdGhlcmJvYXJkKTtcblxuICBjb25zdCB0YXJnZXQgPSBmaWxlcy5maWx0ZXIoKGZpbGUpID0+IGZpbGUgIT09IG1vdGhlcmJvYXJkKTtcbiAgZm9yIChjb25zdCBmaWxlIG9mIHRhcmdldCkge1xuICAgIGNvbnN0IGxhbmcgPSBmaWxlLnNwbGl0KFwiLlwiKVswXTtcbiAgICBjb25zdCB0cmFuc2xhdGlvbiA9IHsgLi4ucmVhZEpTT04oc291cmNlLCBmaWxlKSB9O1xuXG4gICAgY29uc3QgZmllbGRzID0gZ2V0RmllbGRzKGRhdGEpO1xuICAgIGNvbnN0IG1pZ3JhdGlvbiA9IGdldE1pZ3JhdGlvbihkYXRhLCB0cmFuc2xhdGlvbiwgXCJcIik7XG4gICAgY29uc3QgdG90YWwgPSBtaWdyYXRpb24ubGVuZ3RoO1xuICAgIGxldCBjdXJyZW50ID0gMDtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBtaWdyYXRpb24pIHtcbiAgICAgIGNvbnN0IGZyb20gPSBnZXRUcmFuc2xhdGlvbihkYXRhLCBrZXkpO1xuICAgICAgY29uc3QgdG8gPVxuICAgICAgICB0eXBlb2YgZnJvbSA9PT0gXCJzdHJpbmdcIlxuICAgICAgICAgID8gYXdhaXQgZG9UcmFuc2xhdGUoZnJvbSwgZGVmYXVsdERldkxhbmcsIGxhbmcpXG4gICAgICAgICAgOiBmcm9tO1xuICAgICAgY3VycmVudCsrO1xuXG4gICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgYFtpMThuXSBzdWNjZXNzZnVsbHkgdHJhbnNsYXRlZDogJHtmcm9tfSAtPiAke3RvfSAobGFuZzogJHtkZWZhdWx0RGV2TGFuZ30gLT4gJHtsYW5nfSwgcHJvZ3Jlc3M6ICR7Y3VycmVudH0vJHt0b3RhbH0pYCxcbiAgICAgICk7XG4gICAgICBzZXRUcmFuc2xhdGlvbih0cmFuc2xhdGlvbiwga2V5LCB0byk7XG4gICAgfVxuXG4gICAgaWYgKG1pZ3JhdGlvbi5sZW5ndGggPiAwKSB7XG4gICAgICB3cml0ZUpTT04odHJhbnNsYXRpb24sIHNvdXJjZSwgZmlsZSk7XG4gICAgfVxuXG4gICAgY29uc29sZS5pbmZvKFxuICAgICAgYHRyYW5zbGF0aW9uIGZpbGUgJHtmaWxlfSBsb2FkZWQsICR7ZmllbGRzfSBmaWVsZHMgZGV0ZWN0ZWQsICR7bWlncmF0aW9uLmxlbmd0aH0gbWlncmF0aW9uKHMpIGFwcGxpZWRgLFxuICAgICk7XG4gIH1cbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiRDpcXFxcU2t5XFxcXHByb2dyYW1cXFxcanMgd2ViXFxcXGNvYWlcXFxcYXBwXFxcXHNyY1xcXFx0cmFuc2xhdG9yXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxTa3lcXFxccHJvZ3JhbVxcXFxqcyB3ZWJcXFxcY29haVxcXFxhcHBcXFxcc3JjXFxcXHRyYW5zbGF0b3JcXFxcaW8udHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L1NreS9wcm9ncmFtL2pzJTIwd2ViL2NvYWkvYXBwL3NyYy90cmFuc2xhdG9yL2lvLnRzXCI7aW1wb3J0IGZzIGZyb20gXCJmc1wiO1xuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRKU09OKC4uLnBhdGhzOiBzdHJpbmdbXSk6IGFueSB7XG4gIHJldHVybiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwYXRoLnJlc29sdmUoLi4ucGF0aHMpKS50b1N0cmluZygpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlSlNPTihkYXRhOiBhbnksIC4uLnBhdGhzOiBzdHJpbmdbXSk6IHZvaWQge1xuICBmcy53cml0ZUZpbGVTeW5jKHBhdGgucmVzb2x2ZSguLi5wYXRocyksIEpTT04uc3RyaW5naWZ5KGRhdGEsIG51bGwsIDIpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldE1pZ3JhdGlvbihcbiAgbW90aGVyOiBSZWNvcmQ8c3RyaW5nLCBhbnk+LFxuICBkYXRhOiBSZWNvcmQ8c3RyaW5nLCBhbnk+LFxuICBwcmVmaXg6IHN0cmluZyxcbik6IHN0cmluZ1tdIHtcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG1vdGhlcilcbiAgICAubWFwKChrZXkpOiBzdHJpbmdbXSA9PiB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IG1vdGhlcltrZXldLFxuICAgICAgICB0cmFuc2xhdGlvbiA9IGRhdGEgIT09IHVuZGVmaW5lZCAmJiBrZXkgaW4gZGF0YSA/IGRhdGFba2V5XSA6IHVuZGVmaW5lZDtcbiAgICAgIGNvbnN0IHZhbCA9IFtwcmVmaXgubGVuZ3RoID09PSAwID8ga2V5IDogYCR7cHJlZml4fS4ke2tleX1gXTtcblxuICAgICAgc3dpdGNoICh0eXBlb2YgdGVtcGxhdGUpIHtcbiAgICAgICAgY2FzZSBcInN0cmluZ1wiOlxuICAgICAgICAgIGlmICh0eXBlb2YgdHJhbnNsYXRpb24gIT09IFwic3RyaW5nXCIpIHJldHVybiB2YWw7XG4gICAgICAgICAgZWxzZSBpZiAodGVtcGxhdGUuc3RhcnRzV2l0aChcIiEhXCIpKSByZXR1cm4gdmFsO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwib2JqZWN0XCI6XG4gICAgICAgICAgcmV0dXJuIGdldE1pZ3JhdGlvbih0ZW1wbGF0ZSwgdHJhbnNsYXRpb24sIHZhbFswXSk7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcmV0dXJuIHR5cGVvZiB0cmFuc2xhdGlvbiA9PT0gdHlwZW9mIHRlbXBsYXRlID8gW10gOiB2YWw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBbXTtcbiAgICB9KVxuICAgIC5mbGF0KClcbiAgICAuZmlsdGVyKChrZXkpID0+IGtleSAhPT0gdW5kZWZpbmVkICYmIGtleS5sZW5ndGggPiAwKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEZpZWxkcyhkYXRhOiBhbnkpOiBudW1iZXIge1xuICBzd2l0Y2ggKHR5cGVvZiBkYXRhKSB7XG4gICAgY2FzZSBcInN0cmluZ1wiOlxuICAgICAgcmV0dXJuIDE7XG4gICAgY2FzZSBcIm9iamVjdFwiOlxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHJldHVybiBkYXRhLmxlbmd0aDtcbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyhkYXRhKS5yZWR1Y2UoXG4gICAgICAgIChhY2MsIGtleSkgPT4gYWNjICsgZ2V0RmllbGRzKGRhdGFba2V5XSksXG4gICAgICAgIDAsXG4gICAgICApO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gMTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHJhbnNsYXRpb24oZGF0YTogUmVjb3JkPHN0cmluZywgYW55PiwgcGF0aDogc3RyaW5nKTogYW55IHtcbiAgY29uc3Qga2V5cyA9IHBhdGguc3BsaXQoXCIuXCIpO1xuICBsZXQgY3VycmVudCA9IGRhdGE7XG4gIGZvciAoY29uc3Qga2V5IG9mIGtleXMpIHtcbiAgICBpZiAoY3VycmVudFtrZXldID09PSB1bmRlZmluZWQpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgY3VycmVudCA9IGN1cnJlbnRba2V5XTtcbiAgfVxuICByZXR1cm4gY3VycmVudDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldFRyYW5zbGF0aW9uKFxuICBkYXRhOiBSZWNvcmQ8c3RyaW5nLCBhbnk+LFxuICBwYXRoOiBzdHJpbmcsXG4gIHZhbHVlOiBhbnksXG4pOiB2b2lkIHtcbiAgY29uc3Qga2V5cyA9IHBhdGguc3BsaXQoXCIuXCIpO1xuICBsZXQgY3VycmVudCA9IGRhdGE7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwga2V5cy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICBpZiAoY3VycmVudFtrZXlzW2ldXSA9PT0gdW5kZWZpbmVkKSBjdXJyZW50W2tleXNbaV1dID0ge307XG4gICAgY3VycmVudCA9IGN1cnJlbnRba2V5c1tpXV07XG4gIH1cbiAgY3VycmVudFtrZXlzW2tleXMubGVuZ3RoIC0gMV1dID0gdmFsdWU7XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkQ6XFxcXFNreVxcXFxwcm9ncmFtXFxcXGpzIHdlYlxcXFxjb2FpXFxcXGFwcFxcXFxzcmNcXFxcdHJhbnNsYXRvclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcU2t5XFxcXHByb2dyYW1cXFxcanMgd2ViXFxcXGNvYWlcXFxcYXBwXFxcXHNyY1xcXFx0cmFuc2xhdG9yXFxcXGFkYXB0ZXIudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L1NreS9wcm9ncmFtL2pzJTIwd2ViL2NvYWkvYXBwL3NyYy90cmFuc2xhdG9yL2FkYXB0ZXIudHNcIjsvLyBmb3JtYXQgbGFuZ3VhZ2UgY29kZSB0byBuYW1lL0lTTyA2MzktMSBjb2RlIG1hcFxuY29uc3QgbGFuZ3VhZ2VUcmFuc2xhdG9yTWFwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICBjbjogXCJ6aC1DTlwiLFxuICB0dzogXCJ6aC1UV1wiLFxuICBlbjogXCJlblwiLFxuICBydTogXCJydVwiLFxuICBqYTogXCJqYVwiLFxuICBrbzogXCJrb1wiLFxuICBmcjogXCJmclwiLFxuICBkZTogXCJkZVwiLFxuICBlczogXCJlc1wiLFxuICBwdDogXCJwdFwiLFxuICBpdDogXCJpdFwiLFxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldEZvcm1hdHRlZExhbmd1YWdlKGxhbmc6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBsYW5ndWFnZVRyYW5zbGF0b3JNYXBbbGFuZy50b0xvd2VyQ2FzZSgpXSB8fCBsYW5nO1xufVxuXG50eXBlIHRyYW5zbGF0aW9uUmVzcG9uc2UgPSB7XG4gIHJlc3BvbnNlRGF0YToge1xuICAgIHRyYW5zbGF0ZWRUZXh0OiBzdHJpbmc7XG4gIH07XG59O1xuXG5hc3luYyBmdW5jdGlvbiB0cmFuc2xhdGUoXG4gIHRleHQ6IHN0cmluZyxcbiAgZnJvbTogc3RyaW5nLFxuICB0bzogc3RyaW5nLFxuKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgaWYgKGZyb20gPT09IHRvIHx8IHRleHQubGVuZ3RoID09PSAwKSByZXR1cm4gdGV4dDtcbiAgY29uc3QgcmVzcCA9IGF3YWl0IGZldGNoKFxuICAgIGBodHRwczovL2FwaS5teW1lbW9yeS50cmFuc2xhdGVkLm5ldC9nZXQ/cT0ke2VuY29kZVVSSUNvbXBvbmVudChcbiAgICAgIHRleHQsXG4gICAgKX0mbGFuZ3BhaXI9JHtmcm9tfXwke3RvfWAsXG4gICk7XG4gIGNvbnN0IGRhdGE6IHRyYW5zbGF0aW9uUmVzcG9uc2UgPSBhd2FpdCByZXNwLmpzb24oKTtcblxuICByZXR1cm4gZGF0YS5yZXNwb25zZURhdGEudHJhbnNsYXRlZFRleHQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkb1RyYW5zbGF0ZShcbiAgY29udGVudDogc3RyaW5nLFxuICBmcm9tOiBzdHJpbmcsXG4gIHRvOiBzdHJpbmcsXG4pOiBQcm9taXNlPHN0cmluZz4ge1xuICBmcm9tID0gZ2V0Rm9ybWF0dGVkTGFuZ3VhZ2UoZnJvbSk7XG4gIHRvID0gZ2V0Rm9ybWF0dGVkTGFuZ3VhZ2UodG8pO1xuXG4gIGlmIChjb250ZW50LnN0YXJ0c1dpdGgoXCIhIVwiKSkgY29udGVudCA9IGNvbnRlbnQuc3Vic3RyaW5nKDIpO1xuXG4gIHJldHVybiB0cmFuc2xhdGUoY29udGVudCwgZnJvbSwgdG8pO1xufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxTa3lcXFxccHJvZ3JhbVxcXFxqcyB3ZWJcXFxcY29haVxcXFxhcHBcXFxcc3JjXFxcXHRyYW5zbGF0b3JcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXFNreVxcXFxwcm9ncmFtXFxcXGpzIHdlYlxcXFxjb2FpXFxcXGFwcFxcXFxzcmNcXFxcdHJhbnNsYXRvclxcXFxpbmRleC50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovU2t5L3Byb2dyYW0vanMlMjB3ZWIvY29haS9hcHAvc3JjL3RyYW5zbGF0b3IvaW5kZXgudHNcIjtpbXBvcnQgeyBQbHVnaW4sIFJlc29sdmVkQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCB7IHByb2Nlc3NUcmFuc2xhdGlvbiB9IGZyb20gXCIuL3RyYW5zbGF0b3JcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVRyYW5zbGF0aW9uUGx1Z2luKCk6IFBsdWdpbiB7XG4gIHJldHVybiB7XG4gICAgbmFtZTogXCJ0cmFuc2xhdGUtcGx1Z2luXCIsXG4gICAgYXBwbHk6IFwiYnVpbGRcIixcbiAgICBhc3luYyBjb25maWdSZXNvbHZlZChjb25maWc6IFJlc29sdmVkQ29uZmlnKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zb2xlLmluZm8oXCJbaTE4bl0gc3RhcnQgdHJhbnNsYXRpb24gcHJvY2Vzc1wiKTtcbiAgICAgICAgYXdhaXQgcHJvY2Vzc1RyYW5zbGF0aW9uKGNvbmZpZyk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihgZXJyb3IgZHVyaW5nIHRyYW5zbGF0aW9uOiAke2V9YCk7XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBjb25zb2xlLmluZm8oXCJbaTE4bl0gdHJhbnNsYXRpb24gcHJvY2VzcyBmaW5pc2hlZFwiKTtcbiAgICAgIH1cbiAgICB9LFxuICB9O1xufVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUEwUixTQUFT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QUM7QUFBQSxJQUNELHdCQUF3QjtBQUFBLEVBQzFCO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLQyxNQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsS0FBSztBQUFBLElBQ0gscUJBQXFCO0FBQUEsTUFDbkIsTUFBTTtBQUFBLFFBQ0osbUJBQW1CO0FBQUEsTUFDckI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsVUFBVTtBQUFBLElBQ1YsdUJBQXVCO0FBQUEsSUFDdkIsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sZ0JBQWdCO0FBQUEsUUFDaEIsZ0JBQWdCO0FBQUEsTUFDbEI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsU0FBUyxDQUFDQSxVQUFTQSxNQUFLLFFBQVEsVUFBVSxFQUFFO0FBQUEsUUFDNUMsSUFBSTtBQUFBLE1BQ047QUFBQSxNQUNBLE9BQU87QUFBQSxRQUNMLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxNQUNoQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFsicGF0aCIsICJwYXRoIiwgImZzIiwgInBhdGgiLCAicGF0aCIsICJmcyIsICJwYXRoIl0KfQo=
