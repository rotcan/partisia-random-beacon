import type { BigNumber } from '@ethersproject/bignumber'
 
import type { Web3ReactHooks } from '@web3-react/core'
import { formatEther } from 'ethers'
import { useEffect, useState } from 'react'

function useBalances(
  provider?: ReturnType<Web3ReactHooks['useProvider']>,
  accounts?: string[]
): BigNumber[] | undefined {
  const [balances, setBalances] = useState<BigNumber[] | undefined>()

  useEffect(() => {
    if (provider && accounts?.length) {
      let stale = false

      void Promise.all(accounts.map((account) => provider.getBalance(account))).then((balances) => {
        if (!stale) {
          setBalances(balances)
        }
      })

      return () => {
        stale = true
        setBalances(undefined)
      }
    }
  }, [provider, accounts])

  return balances
}

export function AccountsComponent({
  accounts,
  provider,
  ENSNames,
}: {
  accounts: ReturnType<Web3ReactHooks['useAccounts']>
  provider: ReturnType<Web3ReactHooks['useProvider']>
  ENSNames: ReturnType<Web3ReactHooks['useENSNames']>
}) {
  const balances = useBalances(provider, accounts)

  if (accounts === undefined) return null

  return (
    <div>
      Accounts:{' '}
      <b>
        {accounts.length === 0
          ? 'None'
          : accounts?.map((account, i) => (
              <ul key={account} style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <li>{ENSNames?.[i] ?? account}</li>
                <li>{balances?.[i] ? ` (Ξ${formatEther(balances[i].toString())})` : null}</li>
              </ul>
            ))}
      </b>
    </div>
  )
}