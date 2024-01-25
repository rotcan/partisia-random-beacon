import type { Web3ReactHooks } from '@web3-react/core'
import type { MetaMask } from '@web3-react/metamask'
import { ConnectWithSelect } from './ConnectWithSelect'
import { Status } from './Status'
import SingleAccount from './SingleAccount'
import { getTruncatedAddress } from '../../../utils/chain'
import { Grid, Typography } from '@mui/material'

 
interface Props {
  connector: MetaMask
  activeChainId: ReturnType<Web3ReactHooks['useChainId']>
  chainIds?: ReturnType<Web3ReactHooks['useChainId']>[]
  isActivating: ReturnType<Web3ReactHooks['useIsActivating']>
  isActive: ReturnType<Web3ReactHooks['useIsActive']>
  error: Error | undefined
  setError: (error: Error | undefined) => void
  ENSName: ReturnType<Web3ReactHooks['useENSName']>
  provider?: ReturnType<Web3ReactHooks['useProvider']>
  account?: string
}

export function     Card({
  connector,
  activeChainId,
  chainIds,
  isActivating,
  isActive,
  error,
  setError,
  ENSName,
  account,
  provider,
}: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignSelf:"flex-end",
        flexDirection: 'column',
        // justifyContent: 'space-between',
        // width: '20rem',
        // padding: '1rem',
        // marginRight:'1em',
        marginLeft: "auto",
        // overflow: 'auto',
      }}
    >
      {/* <b>{getName(connector)}</b> */}
      <Grid  container
                        direction="column"
                        justifyContent="center"
                        alignContent={"center"}  textAlign={"center"}>
        {/* <div style={{display:"flex"}}>
        <Status isActivating={isActivating} isActive={isActive} error={error} />
        </div> */}
        
          <ConnectWithSelect
          connector={connector}
          activeChainId={activeChainId}
          chainIds={chainIds}
          isActivating={isActivating}
          isActive={isActive}
          error={error}
          setError={setError}
        />
         {account && <Typography variant="caption" component="span">  {getTruncatedAddress(  account)} </Typography>}
         
      </Grid>
      {/* <Chain chainId={activeChainId} /> */}
      {/* <div > */}
        {/* <Accounts accounts={accounts} provider={provider} ENSNames={ENSNames} /> */}
        {/* <SingleAccount ENSName={ENSName} account={account} provider={provider}/> */}
      {/* </div> */}
      
    </div>
  )
}