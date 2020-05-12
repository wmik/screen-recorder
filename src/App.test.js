import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

test('button state', async () => {
  let { findByText } = render(<App />);

  let startButton = await findByText(/start/i, { selector: 'button' });
  let stopButton = await findByText(/stop/i, { selector: 'button' });

  expect(startButton).toBeVisible();
  expect(stopButton).toBeVisible();
  expect(stopButton).toBeDisabled();

  expect(fireEvent.click(startButton)).toBe(true);
  expect(stopButton).toBeEnabled();
  expect(startButton).toBeDisabled();
});
