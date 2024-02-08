import { useState } from "react";
import { ConnectedWallet } from "./ConnectedWallet";
import Contract from "./components/contract/Index";
import Wallet, { WalletState } from "./components/wallet/partisia/Index";
import { Container, Grid, Toolbar } from "@mui/material";
import MetaMaskCard from "./components/wallet/eth/MetamaskCard";



const getDefaultWalletState = (): WalletState => {
    return {
        userAccount: undefined,


    }
}

const Home = () => {

    const [connectedWallet, setConnectedWallet] = useState<WalletState>(getDefaultWalletState());


    const isWalletConnected = () => {
        return connectedWallet && connectedWallet.userAccount !== undefined;
    }
    return (
        <>
            <header className="App-header" >
                <Container maxWidth="xl">
                    <Toolbar variant="regular" >
                        <Grid container spacing={3}>
                            <Grid item  sx={{width:200}}>

                            </Grid>
                            <Grid item sx={{flexGrow:1}}>
                                <div>Verifiable Random Beacon</div>
                            </Grid>
                            <Grid item sx={{width:100}} justifyContent={"flex-end"} textAlign={"right"} >
                                <Wallet connectedWallet={connectedWallet} setConnectedWallet={setConnectedWallet} />
                            </Grid>
                            <Grid item sx={{width:100}} justifyContent={"flex-end"} textAlign={"right"} >
                                <MetaMaskCard />
                            </Grid>
                        </Grid>
                    </Toolbar>
                </Container>
            </header>
            <div className="pure-g">
                <div className="pure-u-1-1">
                    <div>

                        {isWalletConnected() &&
                            (<>

                                <div>
                                    <Contract connectedWallet={connectedWallet.userAccount!} adminWallet={undefined} />
                                </div>
                            </>)
                        }
                        {!isWalletConnected() &&
                        <>Please connect your wallet</>
                        }
                    </div>
                </div>
            </div>

        </>
    )
}

export default Home;