import { getBaseHref } from '@/isomorphic/url';
import { shell } from 'electron';
import TabbedBrowserWindow from '../browser/browsers';
import { getAllDapps, parseDappRedirect } from '../store/dapps';
import { switchToBrowserTab } from '../utils/browser';
import { safeOpenURL } from './dappSafeview';
import { getTabbedWindowFromWebContents } from '../utils/tabbedBrowserWindow';

export function createDappTab(mainTabbedWin: TabbedBrowserWindow, url: string) {
  const continualOpenedTab = mainTabbedWin.createTab({
    initDetails: { url },
  });
  continualOpenedTab?.loadURL(url);

  // const closeOpenedTab = () => {
  //   continualOpenedTab?.destroy();
  // };

  // openDappSecurityCheckView(url, mainTabbedWin.window).then(
  //   ({ continualOpId }) => {
  //     // TODO: use timeout mechanism to avoid memory leak
  //     const dispose = onIpcMainEvent(
  //       '__internal_rpc:security-check:continue-close-dapp',
  //       (_evt, _openId) => {
  //         if (mainTabbedWin.window && _openId === continualOpId) {
  //           dispose?.();
  //           closeOpenedTab();
  //         }
  //       }
  //     );
  //   }
  // );
}

/**
 * @see https://www.electronjs.org/docs/latest/api/window-open
 *
 * it should intercept theses ways to navigate:
 *
 * - clicking on links or submitting forms adorned with target=_blank
 * - JavaScript calling window.open()
 */
export function setOpenHandlerForWebContents({
  webContents,
  parentTabbedWin,
}: {
  webContents: Electron.WebContents;
  parentTabbedWin: TabbedBrowserWindow;
}) {
  const isForTrezorLikeConnection = parentTabbedWin.isForTrezorLikeConnection();

  webContents.setWindowOpenHandler((details) => {
    if (!webContents) return { action: 'deny' };

    const currentUrl = webContents.getURL();
    const dapps = getAllDapps();

    const targetURL = details.url;

    const {
      targetInfo,
      isFromDapp,
      isToExtension,
      isToSameOrigin,
      couldKeepTab,
      allowOpenTab,
      shouldOpenExternal,
      maybeRedirectInSPA,
    } = parseDappRedirect(currentUrl, targetURL, {
      dapps,
      isForTrezorLikeConnection,
    });

    if (shouldOpenExternal) {
      shell.openExternal(targetURL);
      return { action: 'deny' };
    }

    if (isFromDapp && !isToSameOrigin) {
      if (!couldKeepTab || allowOpenTab) {
        safeOpenURL(targetURL, {
          sourceURL: currentUrl,
          existedDapp: targetInfo.foundDapp,
          existedMainDomainDapp: targetInfo.foundMainDomainDapp,
          _targetwin: parentTabbedWin.window,
        }).then((res) => res.activeTab());
      } else {
        webContents.loadURL(targetURL);
      }
    } else if (!isToExtension) {
      switch (details.disposition) {
        case 'foreground-tab':
        case 'background-tab':
        case 'new-window': {
          const openedDapp =
            parentTabbedWin?.tabs.findBySecondaryDomain(targetURL);
          if (openedDapp) {
            switchToBrowserTab(openedDapp!.id, parentTabbedWin!);

            /**
             * sometimes, targetURL has same origin with currentUrl.
             *
             * for SPA, we don't set new url for it.
             * But for static redirect url, we need to set new url.
             */
            if (maybeRedirectInSPA) {
              setTimeout(() => {
                if (webContents.isDestroyed()) return;

                if (
                  getBaseHref(webContents.getURL()) !== getBaseHref(targetURL)
                ) {
                  webContents.loadURL(targetURL);
                }
              }, 200);
            }
          } else {
            createDappTab(parentTabbedWin, targetURL);
          }
          break;
        }
        default: {
          break;
        }
      }
    }

    return {
      action: 'deny',
    };
  });
}

export const setListeners = {
  /**
   * @see https://www.electronjs.org/docs/latest/api/web-contents#event-will-redirect
   *
   * Emitted when a server side redirect occurs during navigation. For example a 302 redirect.
   */
  'will-redirect': (webContents: Electron.WebContents) => {
    webContents.on('will-redirect', (evt, targetURL) => {
      if (!webContents) return;
      const evtWebContents = (evt as any).sender as Electron.WebContents;
      const currentUrl = evtWebContents.getURL();

      const tabbedWin = getTabbedWindowFromWebContents(evtWebContents);
      const dapps = getAllDapps();

      const {
        targetInfo,
        isFromDapp,
        allowOpenTab,
        couldKeepTab,
        shouldOpenExternal,
        isToSameOrigin,
      } = parseDappRedirect(currentUrl, targetURL, {
        dapps,
        isForTrezorLikeConnection: tabbedWin?.isForTrezorLikeConnection(),
      });

      if (shouldOpenExternal) {
        shell.openExternal(targetURL);
        return false;
      }

      // allow redirect in main domain
      if (allowOpenTab || couldKeepTab) return true;

      if (!currentUrl || (isFromDapp && !isToSameOrigin)) {
        evt.preventDefault();
        safeOpenURL(targetURL, {
          existedDapp: targetInfo.foundDapp,
          sourceURL: currentUrl,
        }).then((res) => res.activeTab());

        return false;
      }

      return !!currentUrl;
    });
  },

  /**
   * @see https://www.electronjs.org/docs/latest/api/web-contents#event-will-navigate
   *
   * it should intercept these ways to navigate:
   *
   * - window.location object is changed
   * - click a link with target != "_blank"
   */
  'will-navigate': (
    webContents: Electron.WebContents,
    parentWindow: Electron.BrowserWindow
  ) => {
    webContents.on(
      'will-navigate',
      (evt: Electron.Event, targetURL: string) => {
        const evtWebContents = (evt as any).sender as Electron.WebContents;
        const currentUrl = evtWebContents.getURL();

        const dapps = getAllDapps();
        const tabbedWin = getTabbedWindowFromWebContents(evtWebContents);

        const {
          targetInfo,
          // actually, it's always from dapp on isMainContentsForTabbedWindow=false
          isFromDapp,
          allowOpenTab,
          couldKeepTab,
          shouldOpenExternal,
          isToSameOrigin,
        } = parseDappRedirect(currentUrl, targetURL, {
          dapps,
          isForTrezorLikeConnection: tabbedWin?.isForTrezorLikeConnection(),
        });

        if (shouldOpenExternal) {
          shell.openExternal(targetURL);
          return false;
        }

        if (isFromDapp && !isToSameOrigin) {
          if (allowOpenTab || couldKeepTab) return true;

          evt.preventDefault();
          safeOpenURL(targetURL, {
            sourceURL: currentUrl,
            existedDapp: targetInfo.foundDapp,
            _targetwin: parentWindow,
          }).then((res) => res.activeTab());

          return false;
        }

        return true;
      }
    );
  },
};
