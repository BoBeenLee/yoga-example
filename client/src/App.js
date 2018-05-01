import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import Dropzone from "react-dropzone";
import gql from 'graphql-tag';
import { Mutation } from 'react-apollo';

const uploadFileMutation = gql`
  mutation($file: Upload!) {
    singleUpload(file: $file) {
      id
      path
      filename
      mimetype
      encoding
    }
  }
`;

class App extends Component {
  render() {
    return (
      <div className="App">
        <Mutation mutation={uploadFileMutation}>
          {mutate => (
            <Dropzone onDrop={([file]) => mutate({ variables: { file } })}>
              <p>Try dropping some files here, or click to select files to upload.</p>
            </Dropzone>
          )}
        </Mutation>
      </div>
    );
  }
}


export default App;
