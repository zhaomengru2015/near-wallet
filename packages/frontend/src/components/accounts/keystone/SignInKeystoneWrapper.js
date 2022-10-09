import React, {useCallback, useEffect, useState} from 'react';
import { useDispatch } from 'react-redux';
import { AnimatedQRScanner, Purpose, QRCodeError } from '@keystonehq/animated-qr';
import { Mixpanel } from '../../../mixpanel/index';
import {
    redirectToApp,
    redirectTo,
    clearAccountState
} from '../../../redux/actions/account';
import { clearGlobalAlert } from '../../../redux/actions/status';
import { actions as importZeroBalanceAccountActions } from '../../../redux/slices/importZeroBalanceAccount';
import { importZeroBalanceAccountLedger } from '../../../redux/slices/importZeroBalanceAccount/importAccountThunks';
import { actions as ledgerActions, LEDGER_HD_PATH_PREFIX, LEDGER_MODAL_STATUS, selectKeystoneSignInWithKeystone, selectKeystoneSignInWithKeystoneStatus, selectLedgerTxSigned } from '../../../redux/slices/ledger';
import Container from '../../common/styled/Container.css';
import ImportAccounts from './SignInKeystoneViews/ImportAccounts';
import SignIn from './SignInKeystoneViews/SignIn';
import KeystoneImageCircle from '../../svg/KeystoneImageCircle';
import CameraIcon from '../../svg/CameraIcon';
import ScanIcon from "../../svg/ScanIcon";
import { CryptoMultiAccounts } from '@keystonehq/bc-ur-registry';
import { Translate } from 'react-localize-redux';
const { setZeroBalanceAccountImportMethod } = importZeroBalanceAccountActions;
const {
    signInWithLedger,
    clearSignInWithLedgerModalState
} = ledgerActions;

const CAMERA_STATUS = {
    READY: 'READY',
    PERMISSION_NEEDED: 'PERMISSION_NEEDED',
};


export const VIEWS = {
    SIGN_IN: 'signIn',
    ENTER_ACCOUNT_ID: 'enterAccountId',
    IMPORT_ACCOUNTS: 'importAccounts',
    SUCCESS: 'success'
};

export function SignInKeystoneWrapper(props) {
    const dispatch = useDispatch();
    const [cameraStatus, setCameraStatus] = useState(CAMERA_STATUS.READY);
    const [keyringData, setKeyringData] = useState({});
    const [errorMsg, setErrorMsg] = useState('');
    const [status, setStatus] = useState('scan');

    const updateCameraStatus = (canPlay) => {
        const cameraStatus = canPlay ? CAMERA_STATUS.READY : CAMERA_STATUS.PERMISSION_NEEDED;
        setCameraStatus(cameraStatus);
    };

    
    // const ledgerHdPath = `${LEDGER_HD_PATH_PREFIX}${confirmedPath}'`;
    //
    // const signInWithKeystoneState = useSelector(selectKeystoneSignInWithKeystone);
    // const txSigned = useSelector(selectLedgerTxSigned);
    // const signInWithLedgerStatus = useSelector(selectKeystoneSignInWithKeystoneStatus);
    //
    // const signInWithKeystoneKeys = Object.keys(signInWithKeystoneState || {});
    //
    // const ledgerAccounts = signInWithKeystoneKeys.map((accountId) => ({
    //     accountId,
    //     status: signInWithKeystoneState[accountId].status
    // }));
    //
    // const accountsApproved = signInWithKeystoneKeys.reduce((a, accountId) => signInWithKeystoneState[accountId].status === 'success' ? a + 1 : a, 0);
    // const accountsError = signInWithKeystoneKeys.reduce((a, accountId) => signInWithKeystoneState[accountId].status === 'error' ? a + 1 : a, 0);
    // const accountsRejected = signInWithKeystoneKeys.reduce((a, accountId) => signInWithKeystoneState[accountId].status === 'rejected' ? a + 1 : a, 0);
    // const totalAccounts = signInWithKeystoneKeys.length;
    //
    // useEffect(() => {
    //     dispatch(clearSignInWithLedgerModalState());
    // }, []);

    // useEffect(() => {
    //     if (signInWithLedgerStatus === LEDGER_MODAL_STATUS.ENTER_ACCOUNTID) {
    //         const handleImportZeroBalanceAccountLedger = async () => {
    //             dispatch(clearGlobalAlert());
    //             await dispatch(importZeroBalanceAccountLedger(ledgerHdPath));
    //             // TODO: Provide ledger public key as prop to avoid asking for it again
    //             dispatch(setZeroBalanceAccountImportMethod('ledger'));
    //             dispatch(clearAccountState());
    //             dispatch(redirectToApp());
    //         };
    //         handleImportZeroBalanceAccountLedger();
    //     }
    // }, [signInWithLedgerStatus]);

    // const handleSignIn = async () => {
    //     await Mixpanel.withTracking('IE-Keystone Sign in',
    //         async () => {
    //             await dispatch(signInWithKeystone({ path: ledgerHdPath })).unwrap();
    //         }
    //     );
    // };
    //
    // const handleContinue = () => {
    //     dispatch(redirectToApp());
    // };
    //
    // const handleCancelSignIn = () => {
    //     dispatch(clearSignInWithLedgerModalState());
    // };
    //
    // const handleCancelAuthorize = () => {
    //     dispatch(redirectTo('/recover-account'));
    // };
    const handleScanSuccess = useCallback(async (ur)=>{
        try {
            const cryptoMultiAccounts = CryptoMultiAccounts.fromCBOR(Buffer.from(ur.cbor, 'hex'));
            const cryptoHDKey = cryptoMultiAccounts.getKeys()[0];
            // const pubKey = `ed25519:${bs58.encode(Buffer.from(cryptoHDKey.key))}`;
            // const hdPath = `m/${cryptoHDKey.getOrigin().getPath()}`;
            // if (hdPath !== KEY_DERIVATION_PATH) {
            //     setErrorMsg(t('keystone.qrCode.invalid'));
            //     setStatus('error');
            //     return;
            // }
            // const xfp = cryptoMultiAccounts.getMasterFingerprint().toString('hex');
            // setKeyringData({ xfp, hdPath, pubKey });
            // setStatus('findingAccount');
            // const nearAccount = await generateNearAccountFromPubKey(pubKey);
            // dispatch(setNewCreatedKeystoneAccount({ account: { ...nearAccount, hdPath, xfp } }));
            // checkAccount({
            //     hdPath, xfp, pubKey, fromCreate: !nearAccount.mainnet.register && !nearAccount.testnet.register,
            // });
        } catch (e) {
            setErrorMsg('Something went wrong, Please try again.');
            setStatus('error');
        }
    },[]);

    const handleScanError = ()=>{
        if (error === QRCodeError.UNEXPECTED_QRCODE || error === QRCodeError.INVALID_QR_CODE) {
            setErrorMsg('signInKeystone.invalidQRCode');
            setStatus('error');
        }
    }

    return (
        <>
            <Container className='small-centered border keystone-theme'>
                    <img src={KeystoneImageCircle} className="logo" alt="Keystone" />
                    <p className="desc"><Translate id="signInKeystone.scanQRCode"/></p>
                    <div style={{display: 'flex', justifyContent: 'center', height: 255, width: 255}}>
                        {
                            status === 'scan' && (
                                <div style={{display: cameraStatus === CAMERA_STATUS.READY ? 'block' : 'none'}}>
                                    <AnimatedQRScanner
                                        purpose={Purpose.NEAR_SYNC}
                                        handleScan={handleScanSuccess}
                                        handleError={handleScanError}
                                        videoLoaded={updateCameraStatus}
                                        options={{ width: 255, height: 255 }}
                                    />
                                </div>
                            )
                        }
                        <div style={{display: cameraStatus === CAMERA_STATUS.PERMISSION_NEEDED ? 'block' : 'none'}}>
                            <img src={ScanIcon} className="scan" alt="scan" />
                            <img src={CameraIcon} className="camera" alt="camera" />
                        </div>
                    </div>
                    <p className="note">
                        {cameraStatus === CAMERA_STATUS.READY ? t('keystone.scan.tip') : t('keystone.scan.permission')}
                    </p>
            </Container>
        </>
    );
}
