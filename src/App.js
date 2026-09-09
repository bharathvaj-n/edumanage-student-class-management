import React from 'react';
import './App.css';
import NavBar from './NavBar';
import { BrowserRouter, Routes, Route} from 'react-router-dom';
import Home from './Home';
import Classdetails from './Classdetails';

import Studentdetails from './Studentdetails';
import {useState} from 'react';
import Login from './Login';

function App() {
  // Load token from localStorage on app start
  const savedToken = localStorage.getItem('token');
  const [token, setToken] = useState(savedToken);

  // When user logs in, store token in localStorage too
  const handleSetToken = (newToken) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
  };

  // If not logged in, show Login page
  if (!token) {
    return <Login setToken={handleSetToken} />;
  }

return (
	<div>
    <BrowserRouter>
    <NavBar />
    <br/>
    <Routes>
					<Route exact path="/" element={<Home />} />
					<Route exact path="/class" element={<Classdetails />} />
					{/* <Route exact path="/mine" element={<Mydetails />} /> */}
          <Route exact path="/student" element={<Studentdetails />} />
				</Routes>
        </BrowserRouter>
  </div>
);
}

export default App;
