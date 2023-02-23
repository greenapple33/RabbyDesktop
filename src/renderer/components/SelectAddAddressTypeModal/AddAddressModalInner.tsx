import { useZPopupLayerOnMain } from '@/renderer/hooks/usePopupWinOnMainwin';
import { useMessageForwardToMainwin } from '@/renderer/hooks/useViewsMessage';
import { hideMainwinPopupview } from '@/renderer/ipcRequest/mainwin-popupview';
import { KEYRING_CLASS } from '@/renderer/utils/constant';
import React from 'react';
import { HDManagerModal } from '../HDManager/HDManagerModal';
import { WalletConnectModal } from '../WalletConnect/WalletConnectModal';
import { ContactModal } from './ContactModal';

export interface Props {
  keyringType?: string;
  onBack?: () => void;
  visible: boolean;
  onCancel: () => void;
  showEntryButton?: boolean;
}

export const AddAddressModalInner: React.FC<Props> = ({
  keyringType,
  onBack,
  visible,
  onCancel,
  showEntryButton,
}) => {
  const { hideZSubview } = useZPopupLayerOnMain();
  const mainNav = useMessageForwardToMainwin('route-navigate');

  // close all popupView
  const onSuccess = React.useCallback(() => {
    onCancel();
    hideZSubview('select-add-address-type-modal');
    hideZSubview('address-management');
  }, [onCancel, hideZSubview]);

  const handleImportByPrivateKey = React.useCallback(() => {
    mainNav({
      type: 'route-navigate',
      data: {
        pathname: '/import-by/private-key',
      },
    } as any);
    hideMainwinPopupview('address-management', {
      reloadView: true,
    });
  }, [mainNav]);

  React.useEffect(() => {
    if (keyringType === KEYRING_CLASS.PRIVATE_KEY) {
      handleImportByPrivateKey();
    }
  }, [handleImportByPrivateKey, keyringType]);

  if (keyringType === KEYRING_CLASS.WATCH) {
    return (
      <ContactModal
        centered
        open={visible}
        title="Add Contacts"
        subtitle="You can also use it as a watch-only address"
        backable={!!onBack}
        onBack={onBack}
        destroyOnClose
        onCancel={onCancel}
        footer={null}
        onSuccess={onSuccess}
      />
    );
  }

  if (keyringType === KEYRING_CLASS.WALLETCONNECT) {
    return (
      <WalletConnectModal
        centered
        open={visible}
        title="Wallet Connect"
        backable={!!onBack}
        onBack={onBack}
        destroyOnClose
        onCancel={onCancel}
        footer={null}
        onSuccess={onSuccess}
      />
    );
  }

  if (
    keyringType &&
    [
      KEYRING_CLASS.HARDWARE.LEDGER,
      KEYRING_CLASS.HARDWARE.ONEKEY,
      KEYRING_CLASS.HARDWARE.TREZOR,
    ].includes(keyringType)
  ) {
    return (
      <HDManagerModal
        open={visible}
        onCancel={onSuccess}
        destroyOnClose
        keyringType={keyringType}
        footer={null}
        backable={!!onBack}
        onBack={onBack}
        showEntryButton={showEntryButton}
      />
    );
  }

  return null;
};