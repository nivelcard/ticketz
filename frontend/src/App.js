import React, { useState, useEffect, useMemo } from "react";

import "react-toastify/dist/ReactToastify.css";

import { ptBR } from "@material-ui/core/locale";
import { createTheme, ThemeProvider } from "@material-ui/core/styles";
import ColorModeContext from "./layout/themeContext";
import { PhoneCallProvider } from "./context/PhoneCall/PhoneCallContext";
import { SocketContext, socketManager } from "./context/Socket/SocketContext";
import useSettings from "./hooks/useSettings";
import Favicon from "react-favicon";
import { getBackendURL } from "./services/config";
import brandTokens from "./theme/brandTokens";

import Routes from "./routes";

const defaultLogoLight = brandTokens.logo.light;
const defaultLogoDark = brandTokens.logo.dark;
const defaultLogoFavicon = brandTokens.logo.favicon;

function useViewportHeight() {
  useEffect(() => {
    const setVh = () => {
      const h = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty("--vh", `${h}px`);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", setVh);
      window.visualViewport.addEventListener("scroll", setVh);
    }
    window.addEventListener("resize", setVh);

    setVh(); // initial

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", setVh);
        window.visualViewport.removeEventListener("scroll", setVh);
      }
      window.removeEventListener("resize", setVh);
    };
  }, []);
}

const App = () => {
  const [locale, setLocale] = useState();

  const prefersDarkMode = !!window.matchMedia("(prefers-color-scheme: dark)")
    .matches;
  const preferredTheme = window.localStorage.getItem("preferredTheme");
  const [mode, setMode] = useState(
    preferredTheme ? preferredTheme : prefersDarkMode ? "dark" : "light"
  );
  const [primaryColorLight, setPrimaryColorLight] = useState(
    brandTokens.primaryLight
  );
  const [primaryColorDark, setPrimaryColorDark] = useState(
    brandTokens.primaryDark
  );
  const [appLogoLight, setAppLogoLight] = useState("");
  const [appLogoDark, setAppLogoDark] = useState("");
  const [appLogoFavicon, setAppLogoFavicon] = useState("");
  const [appName, setAppName] = useState("");
  const { getPublicSetting } = useSettings();

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode(prevMode => (prevMode === "light" ? "dark" : "light"));
      },
      setPrimaryColorLight: color => {
        setPrimaryColorLight(color);
      },
      setPrimaryColorDark: color => {
        setPrimaryColorDark(color);
      },
      setAppLogoLight: file => {
        setAppLogoLight(file);
      },
      setAppLogoDark: file => {
        setAppLogoDark(file);
      },
      setAppLogoFavicon: file => {
        setAppLogoFavicon(file);
      },
      setAppName: name => {
        setAppName(name);
      }
    }),
    []
  );

  const calculatedLogoDark = () => {
    if (appLogoDark === defaultLogoDark && appLogoLight !== defaultLogoLight) {
      return appLogoLight;
    }
    return appLogoDark;
  };
  const calculatedLogoLight = () => {
    if (appLogoDark !== defaultLogoDark && appLogoLight === defaultLogoLight) {
      return appLogoDark;
    }
    return appLogoLight;
  };

  const theme = useMemo(
    () =>
      createTheme(
        {
          scrollbarStyles: {
            "&::-webkit-scrollbar": {
              width: "8px",
              height: "8px"
            },
            "&::-webkit-scrollbar-thumb": {
              boxShadow: "inset 0 0 6px rgba(0, 0, 0, 0.3)",
              backgroundColor:
                mode === "light" ? primaryColorLight : primaryColorDark
            }
          },
          scrollbarStylesSoft: {
            "&::-webkit-scrollbar": {
              width: "8px"
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: mode === "light" ? "#F3F3F3" : "#333333"
            }
          },
          palette: {
            type: mode,
            primary: {
              main: mode === "light" ? primaryColorLight : primaryColorDark
            },
            textPrimary:
              mode === "light" ? primaryColorLight : primaryColorDark,
            textCommon: mode === "light" ? "#0F172A" : "#F8FAFC",
            borderPrimary:
              mode === "light"
                ? brandTokens.neutral.borderLight
                : brandTokens.neutral.borderDark,
            background: {
              default:
                mode === "light"
                  ? brandTokens.neutral.backgroundLight
                  : brandTokens.neutral.backgroundDark,
              paper:
                mode === "light"
                  ? brandTokens.neutral.paperLight
                  : brandTokens.neutral.paperDark
            },
            backgroundContrast: {
              default: mode === "light" ? "#E2E8F0" : "#475569",
              paper: mode === "light" ? "#F1F5F9" : "#334155",
              border:
                mode === "light"
                  ? brandTokens.neutral.borderLight
                  : brandTokens.neutral.borderDark
            },
            dark: { main: mode === "light" ? "#1E293B" : "#CBD5E1" },
            light: { main: mode === "light" ? "#F1F5F9" : "#334155" },
            chatBubbleFromMe: {
              main: mode === "light" ? "#DCFCE7" : "#14532D"
            },
            chatBubbleReceived: {
              main: mode === "light" ? "#FFFFFF" : "#1E3A5F"
            },
            chatBackground: {
              main: mode === "light" ? "#F1F5F9" : "#0F172A"
            },
            tabHeaderBackground: mode === "light" ? "#F1F5F9" : "#334155",
            optionsBackground: mode === "light" ? "#F8FAFC" : "#1E293B",
            options: mode === "light" ? "#F8FAFC" : "#475569",
            fontecor: mode === "light" ? primaryColorLight : primaryColorDark,
            fancyBackground:
              mode === "light"
                ? brandTokens.neutral.backgroundLight
                : brandTokens.neutral.backgroundDark,
            bordabox:
              mode === "light"
                ? brandTokens.neutral.borderLight
                : brandTokens.neutral.borderDark,
            newmessagebox: mode === "light" ? "#E2E8F0" : "#334155",
            inputdigita: mode === "light" ? "#FFFFFF" : "#475569",
            contactdrawer: mode === "light" ? "#FFFFFF" : "#1E293B",
            announcements: mode === "light" ? "#F1F5F9" : "#334155",
            login: mode === "light" ? "#FFFFFF" : "#0F172A",
            announcementspopover: mode === "light" ? "#FFFFFF" : "#334155",
            chatlist: { main: mode === "light" ? "#E2E8F0" : "#475569" },
            boxlist: mode === "light" ? "#F1F5F9" : "#475569",
            boxchatlist: mode === "light" ? "#F1F5F9" : "#334155",
            total: mode === "light" ? "#FFFFFF" : "#0F172A",
            messageIcons: mode === "light" ? "#64748B" : "#CBD5E1",
            inputBackground: mode === "light" ? "#FFFFFF" : "#1E293B",
            barraSuperior: mode === "light" ? primaryColorLight : "#334155",
            boxticket: mode === "light" ? "#F1F5F9" : "#475569",
            campaigntab: mode === "light" ? "#F1F5F9" : "#475569",
            ticketzproad: { main: "#39ACE7", contrastText: "white" }
          },
          typography: {
            fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
            h6: { fontWeight: 600 },
            subtitle1: { fontWeight: 500 },
            button: { textTransform: "none", fontWeight: 600 }
          },
          shape: {
            borderRadius: brandTokens.shape.borderRadius
          },
          mode,
          appLogoLight,
          appLogoDark,
          appLogoFavicon,
          appName,
          calculatedLogoLight,
          calculatedLogoDark,
          calculatedLogo: () => {
            if (mode === "light") {
              return calculatedLogoLight();
            }
            return calculatedLogoDark();
          }
        },
        locale
      ),
    [
      appLogoLight,
      appLogoDark,
      appLogoFavicon,
      appName,
      locale,
      mode,
      primaryColorDark,
      primaryColorLight
    ]
  );

  useEffect(() => {
    const i18nlocale = localStorage.getItem("language");
    if (!i18nlocale) {
      return;
    }

    const browserLocale =
      i18nlocale.substring(0, 2) + i18nlocale.substring(3, 5);

    if (browserLocale === "ptBR") {
      setLocale(ptBR);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("preferredTheme", mode);
  }, [mode]);

  useEffect(() => {
    getPublicSetting("primaryColorLight")
      .then(color => {
        setPrimaryColorLight(color || brandTokens.primaryLight);
      })
      .catch(() => {});
    getPublicSetting("primaryColorDark")
      .then(color => {
        setPrimaryColorDark(color || brandTokens.primaryDark);
      })
      .catch(() => {});
    getPublicSetting("appLogoLight")
      .then(
        file => {
          setAppLogoLight(
            file ? `${getBackendURL()}/public/${file}` : defaultLogoLight
          );
        },
        _ => {}
      )
      .catch(() => {});
    getPublicSetting("appLogoDark")
      .then(file => {
        setAppLogoDark(
          file ? `${getBackendURL()}/public/${file}` : defaultLogoDark
        );
      })
      .catch(() => {});
    getPublicSetting("appLogoFavicon")
      .then(file => {
        setAppLogoFavicon(file ? `${getBackendURL()}/public/${file}` : null);
      })
      .catch(() => {});
    getPublicSetting("appName")
      .then(name => {
        setAppName(name || "ticketz");
      })
      .catch(() => {
        setAppName("whitelabel chat");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useViewportHeight();

  return (
    <>
      <Favicon
        url={appLogoFavicon ? theme.appLogoFavicon : defaultLogoFavicon}
      />
      <ColorModeContext.Provider value={{ colorMode }}>
        <PhoneCallProvider>
          <ThemeProvider theme={theme}>
            <SocketContext.Provider value={socketManager}>
              <Routes />
            </SocketContext.Provider>
          </ThemeProvider>
        </PhoneCallProvider>
      </ColorModeContext.Provider>
    </>
  );
};

export default App;
