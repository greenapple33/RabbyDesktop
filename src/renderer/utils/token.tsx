/* eslint-disable import/no-cycle */
/* eslint-disable no-multi-assign */
import { CHAINS, CHAINS_ENUM } from '@debank/common';
import { TokenItem } from '@debank/rabby-api/dist/types';
import { Contract, providers } from 'ethers';
import { hexToString } from 'web3-utils';
import styled from 'styled-components';
import TokensIcons from '../routes/Home/components/TokenIcons';
import { formatUsdValue } from './number';

export const ellipsisTokenSymbol = (text: string, length = 5) => {
  if (text.length <= length) return text;

  const regexp = new RegExp(`^(.{${length}})(.*)$`);
  return text.replace(regexp, '$1...');
};

export const getTokenSymbol = async (
  id: string,
  provider: providers.JsonRpcProvider
) => {
  try {
    const contract = new Contract(
      id,
      [
        {
          constant: true,
          inputs: [],
          name: 'symbol',
          outputs: [
            {
              name: '',
              type: 'string',
            },
          ],
          payable: false,
          stateMutability: 'view',
          type: 'function',
        },
      ],
      provider
    );
    const symbol = await contract.symbol();
    return symbol;
  } catch (e) {
    try {
      const contract = new Contract(
        id,
        [
          {
            constant: true,
            inputs: [],
            name: 'symbol',
            outputs: [
              {
                name: '',
                type: 'bytes32',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
        ],
        provider
      );
      const symbol = await contract.symbol();
      return hexToString(symbol);
    } catch (error) {
      const contract = new Contract(
        id,
        [
          {
            constant: true,
            inputs: [],
            name: 'SYMBOL',
            outputs: [
              {
                name: '',
                type: 'string',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
        ],
        provider
      );
      return contract.SYMBOL();
    }
  }
};

export const geTokenDecimals = async (
  id: string,
  provider: providers.JsonRpcProvider
) => {
  try {
    const contract = new Contract(
      id,
      [
        {
          constant: true,
          inputs: [],
          name: 'decimals',
          outputs: [
            {
              name: '',
              type: 'uint8',
            },
          ],
          payable: false,
          stateMutability: 'view',
          type: 'function',
        },
      ],
      provider
    );
    const decimals = await contract.decimals();
    return decimals;
  } catch (e) {
    const contract = new Contract(
      id,
      [
        {
          constant: true,
          inputs: [],
          name: 'DECIMALS',
          outputs: [
            {
              name: '',
              type: 'uint8',
            },
          ],
          payable: false,
          stateMutability: 'view',
          type: 'function',
        },
      ],
      provider
    );
    return contract.DECIMALS();
  }
};

export const getTokenName = async (
  id: string,
  provider: providers.JsonRpcProvider
) => {
  try {
    const contract = new Contract(
      id,
      [
        {
          constant: true,
          inputs: [],
          name: 'name',
          outputs: [
            {
              name: '',
              type: 'string',
            },
          ],
          payable: false,
          stateMutability: 'view',
          type: 'function',
        },
      ],
      provider
    );
    const name = await contract.name();
    return name;
  } catch (e) {
    try {
      const contract = new Contract(
        id,
        [
          {
            constant: true,
            inputs: [],
            name: 'name',
            outputs: [
              {
                name: '',
                type: 'bytes32',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
        ],
        provider
      );
      const name = await contract.name();
      return hexToString(name);
    } catch (error) {
      const contract = new Contract(
        id,
        [
          {
            constant: true,
            inputs: [],
            name: 'NAME',
            outputs: [
              {
                name: '',
                type: 'string',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
        ],
        provider
      );
      return contract.NAME();
    }
  }
};

export type ValidateTokenParam = {
  id: string;
  symbol: string;
  decimals: number;
};
export const validateToken = async <
  T extends ValidateTokenParam = ValidateTokenParam
>(
  token: T,
  chain: CHAINS_ENUM,
  customRPC: string
) => {
  if (!chain) return true;
  const currentChain = CHAINS[chain];
  if (token.id === currentChain.nativeTokenAddress) {
    if (
      token.symbol !== currentChain.nativeTokenSymbol ||
      token.decimals !== currentChain.nativeTokenDecimals
    ) {
      return false;
    }
    return true;
  }
  try {
    const [decimals, symbol] = await Promise.all([
      geTokenDecimals(
        token.id,
        new providers.JsonRpcProvider(customRPC || currentChain.thridPartyRPC)
      ),
      getTokenSymbol(
        token.id,
        new providers.JsonRpcProvider(customRPC || currentChain.thridPartyRPC)
      ),
    ]);

    if (symbol !== token.symbol || decimals !== token.decimals) {
      return false;
    }
    return true;
  } catch (e) {
    console.error('token verify failed', e);
    return false;
  }
};

export function wrapUrlInImg(url: string, alt?: string, size?: number) {
  return (
    <img
      src={url}
      style={{ width: size || 20, height: size || 20 }}
      alt={alt || ''}
      onError={(ev) => {
        // @ts-ignore
        ev.target.src =
          'rabby-internal://assets/icons/common/token-default.svg';
      }}
    />
  );
}

export const wrapUrlInImgOrDefault = (url?: string, size?: number) => {
  return url ? (
    wrapUrlInImg(url, undefined, size)
  ) : (
    <img
      src="rabby-internal://assets/icons/common/token-default.svg"
      style={{ width: size || 20, height: size || 20 }}
    />
  );
};

const DebtTag = styled.div`
  border: 1px solid #ff6060;
  border-radius: 4px;
  padding: 2px 5px;
  font-weight: 700;
  font-size: 10px;
  line-height: 12px;
  text-transform: uppercase;
  color: #ff6060;
  margin-left: 6px;
`;

export function getTokens(
  tokens: TokenItem[] = [],
  separator = ' + ',
  isDebt = false
) {
  const tokenStr = tokens
    .filter((item) => !!item)
    .map((token) => token.symbol)
    .join(separator);
  const icon = <TokensIcons icons={tokens.map((v) => v?.logo_url)} />;
  return (
    <div className="flex items-center flex-wrap">
      {icon}
      <div>{tokenStr}</div>
      {isDebt && <DebtTag>Debt</DebtTag>}
    </div>
  );
}

export function getUsd(tokens: TokenItem[] = []) {
  // 沒有价格
  if (tokens.every((v) => !v.price)) return '-';
  return `${formatUsdValue(
    tokens.reduce((sum, curr) => {
      const res = (sum += (curr.price || 0) * curr.amount);
      return res;
    }, 0)
  )}`;
}