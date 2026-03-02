---
title: "New Api: `use` in React 19"
author: "Meshack Kitonga"
pubDatetime: 2024-08-20T15:58:25Z
slug: new-api-use-in-react-19
featured: true
draft: false
tags:
  - frontend
  - coding
  - react
description: "This post details how you can use the new API in React `use` to enhance your application."
canonicalURL: ""
---

## Table of contents

## Introduction

React has emerged the go-to framework for most developers for a while now. The release of React 19 comes with a lot of excitement around the new `use` API. But what exactly is this new feature, and how can it make your React projects even better? Let’s break it down.

## What’s the 'use' API All About?

Imagine being able to fetch data in your React components without all the usual hassle. That’s the idea behind the new `use` API.
It’s designed to make working with asynchronous tasks, like data fetching, simpler and more intuitive, directly within your component’s render function. No more juggling useEffect, useState, or handling complex loading states—the 'use' API aims to make your life easier.
`use` is a React API that lets you read the value of a resource like a Promise or context.

```javascript
const value = use(resource);
```

### The Way Things Are Now: A Quick Look

Before we dive into the `use` API, let’s quickly review how we typically handle data fetching in React:

```javascript
function WeatherComponent() {
  const [weatherData, setWeatherData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("https://api.weather.com/current")
      .then(response => response.json())
      .then(data => {
        setWeatherData(data);
        setIsLoading(false);
      })
      .catch(error => {
        setError(error);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) return <div>Loading weather data...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Current Weather: {weatherData.temperature}°C</h1>
    </div>
  );
}
```

NB: This method works but involves a lot of boilerplate. Now, let's see how the `use` API can simplify things.

### How the `use` API Works

With the `use` API, you can streamline the process:

```javascript
import { Suspense, use } from "react";

async function fetchWeatherData() {
  const response = await fetch("https://api.weather.com/current");
  return await response.json();
}

function WeatherComponent() {
  const weatherData = use(fetchWeatherData());

  return (
    <Suspense fallback={<div>Loading weather...</div>}>
      <h1>Current Weather: {weatherData.temperature}°C</h1>
    </Suspense>
  );
}
```

Or even a simpler way of fetching the user data in your react application

```javascript
async function fetchUserProfile(userId) {
  const response = await fetch(`https://api.example.com/users/${userId}`);
  return await response.json();
}

function UserProfile({ userId }) {
  const userData = use(fetchUserProfile(userId));
  return (
    <div>
      <h1>{userData.name}</h1>
      <p>Username: {userData.username}</p>
    </div>
  );
}
```

This code is cleaner and eliminates the need for extra state management or effect hooks.

### How `use` and Suspense Work Together

The `use` API relies on React’s `Suspense` feature. Here’s how it works:

1. Initial Render - On first render, `use` checks if the data is ready.
2. Suspension - If the data isn’t ready, the component suspends, and React shows the fallback specified in Suspense.
3. Data Ready - When the data is ready, React re-renders the component with the fetched data.

This approach simplifies handling loading states and errors.

### Benefits of the `use` API

1. Cleaner Code - Less boilerplate means more readable and maintainable components.
2. Streamlined Flow - Data fetching and rendering are more integrated and easier to follow.
3. Error Reduction - Automatically suspending during data fetches reduces the risk of accessing incomplete data.
4. Better Error Handling - Pair `use` with error boundaries for a smoother experience.
5. Race Condition Management - `use` ensures you always work with the latest data.

### Things to Watch Out For

While the `use` API is powerful and we are all excited about it, there are some things to keep in mind :-

1. Don’t Overuse It - Not every data fetch needs 'use'. For simpler tasks, traditional methods may be more appropriate.
2. Avoid Fetch Waterfalls - Be cautious about chaining multiple fetches, as this can slow down your app.
3. Combine with Server Components - When possible, fetch data on the server to reduce client-side requests.
4. Handle Errors Properly - Always use error boundaries around your 'use' components.

## Conclusion

The `use` API in React 19 is set to make asynchronous operations like data fetching much simpler. With less boilerplate and more integrated handling of data, the `use` API could become a key part of your React toolkit.

As you explore this new feature, consider how it can be used to enhance your current and future projects. What will you build with the `use` API? Let your creativity guide you!

Happy coding!

## References

1. [New Api: use](https://react.dev/reference/react/use) - React page
