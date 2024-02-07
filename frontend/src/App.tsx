import { Container } from '@mui/material';
import './App.css';
import Home from './Home';
import Wallet from './components/wallet/partisia/Index';
import { LoadingProvider } from './components/useLoading';
 
function App() {
  return (
    <div className="App">
       <LoadingProvider>
      <Home/>
      </LoadingProvider>
    </div>
  );
}

export default App;
