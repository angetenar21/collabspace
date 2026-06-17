import React, { useState } from 'react'
import styles from './Signup.module.css';
import axios from 'axios';

const SignupPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword]  = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignupSubmit = async ()=>{
    try {
      if(!email || !password){
        alert('Email or password is invalid');
        return ;
      }
      if(password !== confirmPassword){
        alert("Password did not match")
      }
      const res = await axios.post('http://localhost:5001/auth/signup', {name, email, password},
        {
          headers:{"Content-Type": 'application/json'}
        }
      );
      console.log(res.data);
      alert(res.data.message);
      const urlParams = new URLSearchParams(window.location.search);
      const redirectUrl = urlParams.get('redirect');
      window.location.href = redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : '/login';
    } catch (error) {
      console.log('error', error);
      alert("signup failed");
    }
  }

  return (
    <div className={styles.loginContainer}>
      <form 
        className={styles.loginForm} 
        onSubmit={(e)=>{
          e.preventDefault();
          handleSignupSubmit();
        }}
        >
        <h1 style={{ textAlign: 'center', marginBottom: '32px', marginTop: '0', fontSize: '28px', color: 'var(--text-primary)' }}>Create Account</h1>
        <div className={styles.inputGroup}>
          <label htmlFor="name">Name</label>
          <input type='text' name='name' value={name} onChange={(e)=>setName(e.target.value)} />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="email">Email</label>
          <input type='email' name='email' value={email} onChange={(e)=>setEmail(e.target.value)} />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="password">Password</label>
          <input type='password' name='password' value={password} onChange={(e)=>setPassword(e.target.value)} />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input type='password' name='confirmPassword' value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} />
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>Already have an account? <a href="/login" style={{ color: 'var(--accent-black)', fontWeight: '600', textDecoration: 'none' }}>Login</a></p>

        <button type='submit'>Submit</button>
      </form>
    </div>
  )
}

export default SignupPage