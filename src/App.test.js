import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

test('home UI', async () => {
  let { findByText } = render(<App />);

  expect(await findByText(/record video/i, { selector: 'a' })).toBeVisible();
  expect(await findByText(/record audio/i, { selector: 'a' })).toBeVisible();
  expect(await findByText(/record screen/i, { selector: 'a' })).toBeVisible();
});
