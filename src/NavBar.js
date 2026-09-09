import React from "react";

import {  NavLink } from "react-router-dom";

function NavBar() {

	return (
		<>
			<div>
				<div className="Navbar">
					<div style={{ margin: '10px' }}>
						<NavLink to="/" style={({ isActive }) => ({
							color: isActive ? 'greenyellow' : 'white' })}>
							Home
						</NavLink>
					</div>
					<div style={{ margin: '10px' }}>
						<NavLink to="/class" style={({ isActive }) => ({
							color: isActive ? 'greenyellow' : 'white' })}>
							Class Details
						</NavLink>
					</div>
					{/*<div style={{ margin: '10px' }}>
						<NavLink to="/mine" style={({ isActive }) => ({
							color: isActive ? 'greenyellow' : 'white' })}>
							My Details
						</NavLink>
					</div>*/}
                    <div style={{ margin: '10px' }}>
						<NavLink to="/student" style={({ isActive }) => ({
							color: isActive ? 'greenyellow' : 'white' })}>
							Student Details
						</NavLink>
					</div>
				</div>
				
			</div>
		</>
	);
}

export default NavBar;
