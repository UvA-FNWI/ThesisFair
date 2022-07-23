import React from 'react';
import Nav from 'react-bootstrap/Nav'

import { Link } from 'react-router-dom';
import dashboardIcon from 'bootstrap-icons/icons/person-circle.svg';
import likesIcon from 'bootstrap-icons/icons/heart.svg';
import logoutIcon from 'bootstrap-icons/icons/box-arrow-left.svg';

import './navbar.scss';
import api from '../../api';

class CustomNavbar extends React.Component {
  render() {
    return (
      // <Navbar className='custom-navbar'> // TODO: Make mobile friendly
      //   <Container>
      //     <Navbar.Brand href='/dashboard'>Thesis fair</Navbar.Brand>
      //     <Navbar.Toggle />
      //     <Navbar.Collapse>
      //       <Navbar.Text>Test</Navbar.Text>
      //     </Navbar.Collapse>
      //   </Container>
      // </Navbar>
      <Nav className="d-md-block sidebar flex-column">
        <Link className='logo' to='/dashboard'>
          <img src="/images/uvalogo.svg" width="64" height="64" alt="UvA Logo" />
        </Link>
        <Nav.Item>
            <Link to="/dashboard"><img src={dashboardIcon} alt='' /><span>Dashboard</span></Link>
        </Nav.Item>
        <Nav.Item>
            <Link to="/likes"><img src={likesIcon} alt='' /><span>Likes</span></Link>
        </Nav.Item>

        <Nav.Item className='logout'>
          <div onClick={api.user.logout}>
            <img src={logoutIcon} alt='' />
            <span>Logout</span>
          </div>
        </Nav.Item>
      </Nav>
    );
  }
}

export default CustomNavbar;
