import React from "react";
import RegistrationListItem from "../components/registrationList/registrationList";

class Testing extends React.Component {
  constructor(props) {
    super(props);
  }

  data = [
    {
      selected: true,
      registration: {
        name: "Topic 1",
        email: "abc@example.com",
        tags: [
          {
            fullTag: "AI",
            abbreviation: "AI",
          },
          {
            fullTag: "SE",
            abbreviation: "SE",
          },
        ],
        description: "This is a description",
      },
    },
    {
      selected: false,
      registration: {
        name: "Topic 2",
        email: "def@example.com",
        tags: [
          {
            fullTag: "AI",
            abbreviation: "AI",
          },
          {
            fullTag: "SE",
            abbreviation: "SE",
          },
        ],
        description: "This is a description",
      },
    },
  ];

  render() {
    return (
      <div className="page">
        <div className="page__content">
          {this.data.map((registration) => (
            <RegistrationListItem
              selected={registration.selected}
              registration={registration.registration}
            />
          ))}
        </div>
      </div>
    );
  }
}

export default Testing;
