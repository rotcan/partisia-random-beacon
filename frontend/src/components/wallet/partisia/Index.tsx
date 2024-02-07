import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { ConnectedWallet } from "../../../ConnectedWallet";
import MetamaskWallet from "./Metamask";
import MpcWallet from "./Mpc";
import PrivateWallet from "./Private";
import Contract from "../../contract/Index";
import AdminWallet from "./Admin";
import { Button, Grid, Grow, ListItemText, MenuItem, MenuList, Paper, Popper, Typography } from "@mui/material";
import PersonIcon from '@mui/icons-material/Person';
import { wrapText } from "../../../utils/utils";

export interface WalletState {
    userAccount: ConnectedWallet | undefined,

}

interface Props {
    connectedWallet: WalletState,
    setConnectedWallet: Dispatch<SetStateAction<WalletState>>,
}



const Wallet = (props: Props) => {

    const [status, setStatus] = useState<string>("Disconnected");
    const [open, setOpen] = useState(false);
    const anchorRef = useRef<HTMLButtonElement>(null);

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen);
    };

    const handleClose = (event: Event | React.SyntheticEvent) => {
        if (
            anchorRef.current &&
            anchorRef.current.contains(event.target as HTMLElement)
        ) {
            return;
        }

        setOpen(false);
    };

    function handleListKeyDown(event: React.KeyboardEvent) {
        if (event.key === 'Tab') {
            event.preventDefault();
            setOpen(false);
        } else if (event.key === 'Escape') {
            setOpen(false);
        }
    }

    // return focus to the button when we transitioned from !open -> open
    const prevOpen = useRef(open);
    useEffect(() => {
        if (prevOpen.current === true && open === false) {
            anchorRef.current!.focus();
        }

        prevOpen.current = open;
    }, [open]);
    const isWalletConnected = () => {
        return props.connectedWallet && props.connectedWallet.userAccount !== undefined;
    }

    const logout = () => {
        clearConnection();
        setStatus("Disconnected");
    }
    const clearConnection = () => {
        props.setConnectedWallet(prevState => ({ ...prevState, userAccount: undefined }))
    }

    // const clearAdminConnection = () => {
    //     setAdminWallet(prevState => ({ ...prevState, userAccount: undefined }))
    // }

    const updateWalletCallback = (cw: ConnectedWallet) => {
        console.log("updateWalletCallback", cw.address);
        props.setConnectedWallet(prevState => ({ ...prevState, userAccount: cw }));
    }

    // const updateAdminCallback=(cw: ConnectedWallet)=>{
    //     console.log("updateAdminCallback",cw.address);
    //     setAdminWallet(prevState => ({ ...prevState, userAccount : cw}));
    // }


    const handleConnection = (connect: Promise<ConnectedWallet>, callback?: (connectedWallet: ConnectedWallet) => void, showStatus?: boolean, clearState?: boolean,) => {
        console.log("handleConnection", connect);
        handleToggle();
        if (clearState) clearConnection();
        if (showStatus) setStatus("Connecting...");
        connect
            .then((userAccount) => {
                if (callback) callback(userAccount);

                // Fix UI
                if (showStatus) setStatus(`Logged in: ${userAccount.address}`);

            })
            .catch((error) => {
                if ("message" in error) {
                    if (showStatus) setStatus(error.message);
                } else {
                    if (showStatus) setStatus("An error occurred trying to connect wallet: " + error);
                }
            });
    }


    return (
        <>
            {/* <AdminWallet handleConnection={handleConnection}  callback={updateAdminCallback} 
            connected={adminWallet.userAccount ? true :false} disconnect={clearAdminConnection}/> */}
            
                {/* <p>Account: {status}</p> */}
                {
                    !isWalletConnected() &&
                    (
                        <Grid  container
                        direction="column"
                        justifyContent="center"
                        alignContent={"center"}
                        textAlign={"center"}>
                            {/* <div id="connection-status">
                                <p>Currently not logged in.</p>
                            </div> */}
                            <Grid item  sx={{ flexGrow: 1 }} >
                            <Button
                                ref={anchorRef}
                                id="composition-button"
                                aria-controls={open ? 'composition-menu' : undefined}
                                aria-expanded={open ? 'true' : undefined}
                                aria-haspopup="true"
                                onClick={handleToggle}
                            >
                                <PersonIcon />
                                <Typography variant="caption" component="span">Partisia</Typography>
                            
                            </Button>
                            </Grid>
                            
                            <Popper
                                open={open}
                                anchorEl={anchorRef.current}
                                role={undefined}
                                placement="bottom-start"
                                transition
                                disablePortal
                            >
                                {({ TransitionProps, placement }) => (
                                    <Grow
                                        {...TransitionProps}
                                        style={{
                                            transformOrigin:
                                                placement === 'bottom-start' ? 'left top' : 'left bottom',
                                        }}
                                    >
                                        <Paper className="textAlignLeft" >
                                            <MenuList dense>
                                                <MenuItem>
                                                    <ListItemText inset><MetamaskWallet handleConnection={handleConnection} callback={updateWalletCallback} />
                                                    </ListItemText>
                                                </MenuItem>
                                                <MenuItem>
                                                    <ListItemText inset><MpcWallet handleConnection={handleConnection} callback={updateWalletCallback} />
                                                    </ListItemText>
                                                </MenuItem>
                                                <MenuItem>
                                                    <ListItemText inset><PrivateWallet handleConnection={handleConnection} callback={updateWalletCallback} />
                                                    </ListItemText>
                                                </MenuItem>


                                            </MenuList>
                                        </Paper>
                                    </Grow>
                                )}
                            </Popper>
                        </Grid>
                    )

                }
                {isWalletConnected() &&
                    (<>

                        <Grid
                            container
                            direction="column"
                            justifyContent="center"
                            textAlign={"center"}
                        >
                           
                            <Button
                                className="alignSelfRight"
                                id="wallet-disconnect-btn"
                                onClick={(e) => { e.preventDefault(); logout(); }}
                            > <PersonIcon /> <Typography variant="caption" component="span">Partisia</Typography></Button>
                            <Typography variant="caption" component="span">  {wrapText(props.connectedWallet.userAccount?.address)} </Typography>
                            
                        </Grid>
                        {/* <div>
                            <Contract connectedWallet={connectedWallet.userAccount!} adminWallet={adminWallet.userAccount} />
                        </div> */}
                    </>)
                }
             
        </>
    )
}

export default Wallet;