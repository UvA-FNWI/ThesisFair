import fuzzysort from 'fuzzysort'
import React from 'react'
import { Button, Container, Form } from 'react-bootstrap'
import { Link, useParams } from 'react-router-dom'

import api from '../../api'
import EntityList from '../../components/entityList/entityList'
import Tag from '../../components/tag/tag'
import { getParticipatingFairs } from '../../utilities/entities'
import { getPaymentTagClassName, getPaymentTooltip } from '../../utilities/fairs'

import '../../styles/events.scss'

const entityTypes = ['A', 'B', 'C', 'Partner', 'Lab 42', 'Free', 'unknown']

class Entities extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      entities: [],
      allEvents: [],
      allEventsByEvid: {},
      entitiesByEnid: {},
      entityNames: [],
      filteredEntities: [],
      searchFilter: '',
      error: false,
      filters: {
        search: '',
        types: entityTypes.map(type => type.replace(' ', '')),
      },
    }
  }

  searchFilterFunction = (entities, filters) => {
    if (!filters.search) return entities

    return fuzzysort
      .go(filters.search, this.state.entityNames, { key: 'name', limit: 25, threshold: -5000 })
      .map(e => this.state.entitiesByEnid[e.obj.enid])
  }

  degreeFilterFunction = (entities, filters) => {
    if (filters.types.length === 0) return []

    return entities.filter(entity => !entity.type || filters.types.includes(entity.type.replace(' ', '')))
  }

  filterFunctions = [this.searchFilterFunction, this.degreeFilterFunction]

  filter = (filters, allEntities = this.state.entities) => {
    const filteredEntities = this.filterFunctions.reduce(
      (entities, filterFunction) => filterFunction(entities, filters),
      allEntities
    )

    this.setState({ filteredEntities })
  }

  search = searchFilter => {
    if (searchFilter === this.state.filters.search) return

    if (searchFilter === '' || searchFilter === null) {
      const filters = { ...this.state.filters, search: '' }

      this.setState({ filters })
      this.filter(filters)
      return
    }

    const filters = { ...this.state.filters, search: searchFilter }

    this.setState({ filters })

    this.filter(filters)
  }

  sortEntities = (a, b) => {
    const aName = a.name.toLowerCase().trim()
    const bName = b.name.toLowerCase().trim()

    if (aName < bName) return -1
    if (aName > bName) return 1
    return 0
  }

  async componentDidMount() {
    let entities
    try {
      entities = await api.entity.getAll(null, { enid: true, name: true, type: true, payments: true }).exec()
    } catch (error) {
      console.log(error)
      this.setState({ error: true })
    }

    if (!entities || entities.length === 0) {
      this.setState({ error: true })
      return
    }

    entities = entities.map(entity => ({ ...entity, name: entity.name.trim() })).sort(this.sortEntities)

    // Fetch info about all events to pass on to entries on entities, so they
    // don't have to fetch it (state passes down)
    let events
    try {
      events = await api.event.getAll().exec()
    } catch (error) {
      console.log(error)
      this.setState({ error: true })
    }

    if (!events || events.length === 0) {
      this.setState({ error: true })
      return
    }

    const entityNames = entities.map(entity => ({ enid: entity.enid, name: entity.name }))
    const entitiesByEnid = Object.fromEntries(entities?.map(entity => [entity.enid, entity]) || [])
    const allEventsByEvid = Object.fromEntries(events?.map(event => [event.evid, event]) || [])

    this.setState({
      entities,
      entitiesByEnid,
      entityNames,
      allEvents: events,
      allEventsByEvid,
    })

    this.filter(this.state.filters, entities)
  }

  changeEntityType = async (enid, event) => {
    const type = event.target.value

    const entity = {
      enid,
      type,
    }

    try {
      await api.entity.update(entity).exec()
    } catch (error) {
      console.log(error)
    }
  }

  getNoResultText() {
    switch (true) {
      // First case assumes there is at least one entity
      case !this.state.error && this.state.entities?.length === 0:
        return 'Loading...'
      case !this.state.error && this.state.filteredEntities?.length === 0:
        return 'No organisations found with the given filters and/or search term.'
      default:
        return 'Something went wrong while loading the organisations.'
    }
  }

  render() {
    return (
      <Container>
        <h1 className='events-page__header'>Organisations</h1>

        <Link to='/organisation/create/'>
          <Button variant='outline-primary' className='mb-2'>
            Create new organisation
          </Button>
        </Link>

        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          {entityTypes.map(type => {
            return (
              <Tag
                key={type}
                label={type.length === 1 ? `Type ${type}` : type}
                className='mr-2'
                selectable={true}
                selected={this.state.filters.types.includes(type.replace(' ', ''))}
                onClick={() => {
                  let filters

                  if (this.state.filters.types.includes(type.replace(' ', ''))) {
                    filters = {
                      ...this.state.filters,
                      types: this.state.filters.types.filter(t => t !== type.replace(' ', '')),
                    }

                    this.setState({ filters })
                  } else {
                    filters = { ...this.state.filters, types: [...this.state.filters.types, type.replace(' ', '')] }

                    this.setState({ filters })
                  }

                  this.filter(filters)
                }}
              />
            )
          })}
        </div>

        <Form className='search-bar'>
          <Form.Group className='mb-3' controlId='searchBar'>
            <Form.Control type='text' placeholder='Search organisations' onInput={e => this.search(e.target.value)} />
          </Form.Group>
        </Form>

        {this.state.filteredEntities?.length > 0 ? (
          <EntityList
            items={this.state.filteredEntities.map(entity => ({
              enid: entity.enid,
              name: entity.name,
              getTags: async () => {
                const fairs = await getParticipatingFairs(api.project.getOfEntity, this.state.allEventsByEvid, entity)

                return fairs?.map(fair => {
                  const payment = entity.payments?.filter(
                    payment => new Date(payment.eventDate).setHours(0, 0, 0, 0) === fair.date
                  )?.[0]

                  return {
                    ...fair,
                    payment,
                  }
                })
              },
              createTag: ({ date, events, name, payment }) => (
                <Tag
                  key={`payment-${events[0].evid}`}
                  className={getPaymentTagClassName(payment?.status)}
                  label={name}
                  tooltip={getPaymentTooltip(events, date, payment?.status)}
                  selectable={false}
                  onClick={() => payment?.url && window.open(payment.url, '_blank').focus()}
                />
              ),
              headerButtons: () => (
                <>
                  <Form.Select
                    size='md'
                    onChange={e => this.changeEntityType(entity.enid, e)}
                    defaultValue={entity.type}
                  >
                    <option value='A'>Type A</option>
                    <option value='B'>Type B</option>
                    <option value='C'>Type C</option>
                    <option value='Partner'>Partner</option>
                    <option value='Lab42'>Lab 42</option>
                    <option value='Free'>Free</option>
                    <option value='unknown'>unknown</option>
                  </Form.Select>
                  <Link to={`/organisation/${entity.enid}/edit/`}>
                    <Button variant='primary'>Edit</Button>
                  </Link>
                </>
              ),
            }))}
          />
        ) : (
          <p>{this.getNoResultText()}</p>
        )}
      </Container>
    )
  }
}

function EntitiesWithParams(props) {
  const params = useParams()

  return <Entities {...props} params={params} />
}

export default EntitiesWithParams
