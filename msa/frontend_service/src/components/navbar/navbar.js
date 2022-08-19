import React from 'react';
import Nav from 'react-bootstrap/Nav'

import { Link, useParams } from 'react-router-dom';
import dashboardIcon from 'bootstrap-icons/icons/person-circle.svg';
import likesIcon from 'bootstrap-icons/icons/heart.svg';
import organisationsIcon from 'bootstrap-icons/icons/building.svg';
import projectsIcon from 'bootstrap-icons/icons/list-task.svg';
import scheduleIcon from 'bootstrap-icons/icons/calendar.svg';
import logoutIcon from 'bootstrap-icons/icons/box-arrow-left.svg';

import './navbar.scss';
import api from '../../api';

function CustomNavbar(props) {
  const params = useParams();
  const type = api.getApiTokenData().type;

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
      <Link className='logo' to={`/${params.evid}/dashboard`}>
        <img src="/images/uvalogo.svg" width="64" height="64" alt="UvA Logo" />
      </Link>
      <Nav.Item>
        <Link to={`/${params.evid}/account`}><img src={dashboardIcon} alt='' /><span>Dashboard</span></Link>
      </Nav.Item>
      { type === 's' ?
      <>
        <Nav.Item>
          <Link to={`/${params.evid}/organisations`}><img src={organisationsIcon} alt='' /><span>Orgs</span></Link>
        </Nav.Item>
        <Nav.Item>
          <Link to={`/${params.evid}/votes`}><img src={likesIcon} alt='' /><span>Votes</span></Link>
        </Nav.Item>
        <Nav.Item>
          <Link to={`/${params.evid}/schedule`}><img src={scheduleIcon} alt='' /><span>Schedule</span></Link>
        </Nav.Item>
      </>
      : null }

      { type === 'r' ?
        <>
          <Nav.Item>
            <Link to={`/${params.evid}/projects`}><img src={projectsIcon} alt='' /><span>Projects</span></Link>
          </Nav.Item>
          { api.getApiTokenData().repAdmin === true ?
            <Nav.Item>
              <Link to={`/${params.evid}/organisation`}><img src={organisationsIcon} alt='' /><span>Organisation</span></Link>
            </Nav.Item>
            : null
           }
        </>
        : null
      }

      <Nav.Item className='logout'>
        <div onClick={api.user.logout}>
          <img src={logoutIcon} alt='' />
          <span>Logout</span>
        </div>
      </Nav.Item>
    </Nav>
  );
}

export default CustomNavbar;
