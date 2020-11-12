const { join } = require("path");
const { logTitle, logItem } = require("../../helpers/logger");
const { NETLIFY_PUBLISH_PATH } = require("../../config");
const getFilePathForRoute = require("../../helpers/getFilePathForRoute");
const getFilePathForRouteWithI18n = require("../../helpers/getFilePathForRouteWithI18n");
const getNextConfig = require("../../helpers/getNextConfig");
const isRouteWithFallback = require("../../helpers/isRouteWithFallback");
const setupStaticFileForPage = require("../../helpers/setupStaticFileForPage");
const setupNetlifyFunctionForPage = require("../../helpers/setupNetlifyFunctionForPage");
const pages = require("./pages");

// Copy pre-rendered SSG pages
const setup = () => {
  logTitle(
    "🔥 Copying pre-rendered pages with getStaticProps and JSON data to",
    NETLIFY_PUBLISH_PATH
  );

  // Keep track of the functions that have been set up, so that we do not set up
  // a function for the same file path twice
  const filePathsDone = [];

  pages.forEach(({ route, dataRoute, srcRoute }) => {
    logItem(route);

    const nextConfig = getNextConfig();

    // If an app is using Next 10+'s i18n feature, next will put statically
    // generated files under a different path for each different locale
    if (nextConfig.i18n) {
      const { locales } = nextConfig.i18n;
      if (!locales || locales.length === 0) return;

      // ok so you dont need to loop over for srcRoutes and do the
      // set up twice
      const isNotDynamic = !srcRoute;
      // Dynamic routes dont need special helper, Next auto prepends with locale
      // in prerender-manifest
      if (isNotDynamic) {
        locales.forEach((locale) => {
          // Copy pre-rendered HTML page
          const htmlPath = getFilePathForRouteWithI18n(route, "html", locale);
          setupStaticFileForPage(htmlPath);
        });
        // Copy page's JSON data
        // TO-DO: get more clarity on dataRoute logic/files;
        // dataRoute is the same for both/all locales (as is route above)
        // BUT in setupStaticFileForPage we use the second arg as the outputhPath
        // (unlike the html pages above where we use the first arg/route as the outputPath)
        // and its not clear why.. but assuming we only have/need this
        // one json we dont need to do in the locale loop/for each locale
        const jsonPath = getFilePathForRouteWithI18n(
          route,
          "json",
          nextConfig.i18n.defaultLocale || locales[0]
        );
        setupStaticFileForPage(jsonPath, dataRoute);
      } else {
        // Copy pre-rendered HTML page
        const htmlPath = getFilePathForRoute(route, "html");
        setupStaticFileForPage(htmlPath);

        // Copy page's JSON data
        const jsonPath = getFilePathForRoute(route, "json");
        setupStaticFileForPage(jsonPath, dataRoute);
      }
    } else {
      // Copy pre-rendered HTML page
      const htmlPath = getFilePathForRoute(route, "html");
      setupStaticFileForPage(htmlPath);

      // Copy page's JSON data
      const jsonPath = getFilePathForRoute(route, "json");
      setupStaticFileForPage(jsonPath, dataRoute);
    }

    // // Set up the Netlify function (this is ONLY for preview mode)
    const relativePath = getFilePathForRoute(srcRoute || route, "js");
    const filePath = join("pages", relativePath);

    // Skip if we have already set up a function for this file
    // or if the source route has a fallback (handled by getStaticPropsWithFallback)
    if (filePathsDone.includes(filePath) || isRouteWithFallback(srcRoute))
      return;

    logItem(filePath);
    setupNetlifyFunctionForPage(filePath);
    filePathsDone.push(filePath);
  });
};

module.exports = setup;
