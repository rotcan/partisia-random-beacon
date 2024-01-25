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
        if (stale) return
        setBalances(balances)
      })

      return () => {
        stale = true
        setBalances(undefined)
      }
    }
  }, [provider, accounts])

  return balances
}

export function Accounts({
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
    <div style={{textAlign:'left',display:"flex"}}>
      <div style={{display:"flex"}}>
      Accounts:{' '}
      </div>
      <div style={{display:"flex"}}>
        {accounts.length === 0
          ? 'None'
          : accounts?.map((account, i) => (
              <ul key={account} style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{width:"10em", display:"inline-block"}}>{ENSNames?.[i] ?? account}</span>
                <span>{balances?.[i] ? ` (Ξ${formatEther(balances[i].toString())})` : null}</span>
              </ul>
            ))}
      </div>
    </div>
  )
}