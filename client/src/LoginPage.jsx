import React, { useState } from 'react'
import styles from './Login.module.css';
import axios from 'axios';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword]  = useState('');

  const handleLoginSubmit = async ()=>{
    try {
      if(!email || !password){
        alert('Email or password is invalid');
        return ;
      }

      const res = await axios.post('http://localhost:5001/auth/login', {email, password});
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      console.log(res.data);
      alert(res.data.message);
      window.location.href = '/';
    } catch (error) {
      alert('login failed');
      console.log('error', error);
    }
  }

  return (
    <div className={styles.loginContainer}>
      <form 
        className={styles.loginForm} 
        onSubmit={(e)=>{
          e.preventDefault();
          handleLoginSubmit()
        }}
      >
        <h1 style={{ textAlign: 'center', marginBottom: '32px', marginTop: '0', fontSize: '28px', color: 'var(--text-primary)' }}>Welcome Back</h1>
        <div className={styles.inputGroup}>
          <label htmlFor="email">Email</label>
          <input type='email' name='email' value={email} onChange={(e)=>setEmail(e.target.value)} />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="password">Password</label>
          <input type='password' name='password' value={password} onChange={(e)=>setPassword(e.target.value)} />
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>Don't have an account? <a href="/signup" style={{ color: 'var(--accent-black)', fontWeight: '600', textDecoration: 'none' }}>Sign up</a></p>

        <button type='submit'>Submit</button>
      </form>
    </div>
  )
}

export default LoginPage