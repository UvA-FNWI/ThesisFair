import React from 'react'
import Nav from 'react-bootstrap/Nav'
import Navbar from 'react-bootstrap/Navbar'

import { Link, useParams } from 'react-router-dom'
import accountIcon from 'bootstrap-icons/icons/person-circle.svg'
import likesIcon from 'bootstrap-icons/icons/heart.svg'
import organisationsIcon from 'bootstrap-icons/icons/building.svg'
import projectsIcon from 'bootstrap-icons/icons/list-task.svg'
import eventIcon from 'bootstrap-icons/icons/calendar-event.svg'
import userIcon from 'bootstrap-icons/icons/people.svg'
import overrideUserIcon from 'bootstrap-icons/icons/person.svg'
import logoutIcon from 'bootstrap-icons/icons/box-arrow-left.svg'

import './navbar.scss'
import api from '../../api'

const navigationBarItems = eventId => ({
  a: [
    { name: 'Account', icon: accountIcon, link: '/account' },
    { name: 'Events', icon: eventIcon, link: '/' },
    { name: 'Students', icon: userIcon, link: '/students' },
    { name: 'LoginAs', icon: overrideUserIcon, link: '/loginAs' },
    { name: 'Testing', icon: overrideUserIcon, link: '/testing' },
    { name: 'Register', icon: overrideUserIcon, link: '/register' },
  ],
  s: [
    { name: 'Account', icon: accountIcon, link: `/${eventId}/account` },
    { name: 'Event', icon: eventIcon, link: `/${eventId}/event` },
    { name: 'Orgs', icon: organisationsIcon, link: `/${eventId}/organisations` },
    { name: 'Votes', icon: likesIcon, link: `/${eventId}/votes` },
  ],
  r: [
    { name: 'Account', icon: accountIcon, link: `/${eventId}/account` },
    { name: 'Event', icon: eventIcon, link: `/${eventId}/event` },
    { name: 'Projects', icon: projectsIcon, link: `/${eventId}/projects` },
  ],
  ra: [
    { name: 'Account', icon: accountIcon, link: `/${eventId}/account` },
    { name: 'Organisation', icon: organisationsIcon, link: `/${eventId}/organisation` },
    { name: 'Event', icon: eventIcon, link: `/${eventId}/event` },
    { name: 'Projects', icon: projectsIcon, link: `/${eventId}/projects` },
  ],
})

function CustomNavbar(props) {
  const params = useParams()
  const type = api.getApiTokenData().type === 'r' && api.getApiTokenData().repAdmin ? 'ra' : api.getApiTokenData().type

  // Get current page
  const currentPage = window.location.pathname.split('/')[2]

  return (
    <Navbar className='ps-2 pe-2 p-md-0' bg='primary' expand='sm'>
      <Navbar.Brand className='d-md-none'>
        <Link to={`/${params.evid || ''}`}>
          <img src='/images/uvalogo.svg' width='64' height='64' alt='UvA Logo' />
        </Link>
      </Navbar.Brand>
      <Navbar.Toggle aria-controls='topNavbar' />
      <Navbar.Collapse id='topNavbar' className='justify-content-end'>
        <Nav className='sidebar navbar flex-row flex-md-column justify-content-start'>
          <Link className='logo d-none d-md-block' to={`/${params.evid || ''}`}>
            <img src='/images/uvalogo.svg' width='64' height='64' alt='UvA Logo' />
          </Link>

          {navigationBarItems(params.evid)[type].map(({ name, icon, link }, index) => (
            <Nav.Item key={index}>
              <Link className={`nav-link ${currentPage === name.toLowerCase() ? 'active' : ''}`} to={link}>
                <img src={icon} alt='' />
                <span>{name}</span>
              </Link>
            </Nav.Item>
          ))}

          <Nav.Item className='logout'>
            <div
              onClick={
                api.apiTokenOverriden()
                  ? () => {
                      api.overrideApiTokenData(null)
                      window.location.href = '/loginAs'
                    }
                  : api.user.logout
              }
            >
              <img src={logoutIcon} alt='' />
              <span>{api.apiTokenOverriden() ? 'Return' : 'Logout'}</span>
            </div>
          </Nav.Item>
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  )
}

export default CustomNavbar
