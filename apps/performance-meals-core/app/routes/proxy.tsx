// Flat resource routes use /proxy/meal-plan; no customer page is served outside the theme.
import {Outlet} from 'react-router';
export default function ProxyLayout(){return <Outlet/>;}
