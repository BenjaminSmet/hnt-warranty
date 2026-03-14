import { signInWithPopup } from 'firebase/auth';
import { auth, provider } from './firebase';

function Login() {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <h1>HNT Warranty</h1>
      <button onClick={handleLogin}>Sign in with Google</button>
    </div>
  );
}

export default Login;