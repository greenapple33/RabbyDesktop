import { useEffect, useState } from 'react';

export function usePopupWinInfo<T extends IContextMenuPageInfo['type']>(
  type: T
) {
  const [localVisible, setLocalVisible] = useState(false);

  const [info, setInfo] = useState<{
    visible: boolean;
    pageInfo: (IContextMenuPageInfo & { type: typeof type }) | null;
  }>({
    visible: false,
    pageInfo: null,
  });

  useEffect(() => {
    return window.rabbyDesktop.ipcRenderer.on(
      '__internal_push:popupwin-on-mainwin:on-visiblechange',
      (payload) => {
        if (payload.type !== type) return;

        if (payload.visible) {
          setInfo({
            visible: true,
            pageInfo: payload.pageInfo as any,
          });
          setLocalVisible(true);
        } else {
          setLocalVisible(false);
          setInfo({
            visible: false,
            pageInfo: null,
          });
        }
      }
    );
  }, [type]);

  return {
    localVisible,
    setLocalVisible,
    visible: info.visible,
    pageInfo: info.pageInfo,
  };
}
