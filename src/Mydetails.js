import React,{useState} from 'react';
import SortDict from './SortDict';
const Mydetails = () => {
	const data=[
		
		{
			a:11,
			b:22,
			c:33
		},
		{
			a:1,
			b:2,
			c:3
		},
		{
			a:111,
			b:222,
			c:333
		},
		{
			a:11111,
			b:22222,
			c:33333
		},
		{
			a:1111,
			b:2222,
			c:3333
		}
		
	]
	const [E,setE] =useState([]);
	const handleClick=()=>{
		setE(SortDict(data,'a'))
	}
return (
	<div className='container'>
		<h1>
			My details</h1>
			<button onClick={handleClick}>click here to try</button>
	{E.map((val)=>{
		return(
			<p>{val.a}</p>
			)
	})}

	</div>
)
};

export default Mydetails;
