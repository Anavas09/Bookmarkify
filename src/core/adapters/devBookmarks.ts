import { createFakeBookmarks, type FakeBookmarks, type FakeTree } from './fakeChromeBookmarks.ts'

// Local noon, so the card shows the same day in any time zone.
const day = (iso: string) => new Date(`${iso}T12:00:00`).getTime()

// Varied on purpose: nested folders, duplicates (a trailing slash, a utm_
// parameter), dates from 2014 on and a bookmarklet the app leaves out.
// Built on call, so the extension build does not keep any of it.
function sample(): FakeTree {
  return {
    bar: [
      { title: 'React', url: 'https://react.dev/', dateAdded: day('2023-03-16') },
      { title: 'MDN Web Docs', url: 'https://developer.mozilla.org/es/', dateAdded: day('2019-05-02') },
      { title: 'GitHub', url: 'https://github.com/', dateAdded: day('2016-08-10') },
      {
        title: 'Trabajo',
        dateAdded: day('2021-01-11'),
        children: [
          { title: 'Vite', url: 'https://vite.dev/guide/', dateAdded: day('2024-02-20') },
          { title: 'Tailwind CSS', url: 'https://tailwindcss.com/docs', dateAdded: day('2024-02-21') },
          { title: 'Zustand', url: 'https://github.com/pmndrs/zustand', dateAdded: day('2024-03-02') },
          {
            title: 'Diseño',
            dateAdded: day('2022-06-01'),
            children: [
              { title: 'Refactoring UI', url: 'https://www.refactoringui.com/', dateAdded: day('2022-06-01') },
              { title: 'Dribbble', url: 'https://dribbble.com/', dateAdded: day('2018-09-14') },
            ],
          },
        ],
      },
      {
        title: 'Noticias',
        dateAdded: day('2017-03-03'),
        children: [
          { title: 'Hacker News', url: 'https://news.ycombinator.com/', dateAdded: day('2017-03-03') },
          { title: 'El País', url: 'https://elpais.com/', dateAdded: day('2015-10-21') },
          { title: 'The Verge', url: 'https://www.theverge.com/', dateAdded: day('2018-01-09') },
        ],
      },
      {
        title: 'Leer después',
        url: "javascript:void(open('https://getpocket.com/save?url='+encodeURIComponent(location.href)))",
        dateAdded: day('2016-04-30'),
      },
    ],
    other: [
      {
        title: 'Lectura',
        dateAdded: day('2019-02-12'),
        children: [
          {
            title: 'A Complete Guide to useEffect',
            url: 'https://overreacted.io/a-complete-guide-to-useeffect/',
            dateAdded: day('2019-03-09'),
          },
          {
            title: 'useEffect, desde Twitter',
            url: 'https://overreacted.io/a-complete-guide-to-useeffect/?utm_source=twitter',
            dateAdded: day('2019-03-10'),
          },
          {
            title: 'A Complete Guide to CSS Grid',
            url: 'https://css-tricks.com/snippets/css/complete-guide-grid/',
            dateAdded: day('2018-11-05'),
          },
          { title: 'Aprende React', url: 'https://react.dev/learn', dateAdded: day('2023-03-20') },
        ],
      },
      {
        title: 'Recetas',
        dateAdded: day('2020-04-02'),
        children: [
          {
            title: 'Tortilla de patatas',
            url: 'https://www.directoalpaladar.com/recetas-de-huevos/tortilla-de-patatas-receta-clasica',
            dateAdded: day('2020-04-02'),
          },
          { title: 'Pan casero', url: 'https://www.recetasderechupete.com/pan-casero/', dateAdded: day('2020-04-05') },
          {
            title: 'Gazpacho andaluz',
            url: 'https://www.recetasgratis.net/receta-de-gazpacho-andaluz-10405.html',
            dateAdded: day('2021-07-14'),
          },
        ],
      },
      {
        title: 'Viajes',
        dateAdded: day('2018-12-01'),
        children: [
          { title: 'Lisboa', url: 'https://www.visitlisboa.com/es', dateAdded: day('2022-09-18') },
          { title: 'Skyscanner', url: 'https://www.skyscanner.es/', dateAdded: day('2018-12-01') },
          {
            title: 'Japón 2019',
            dateAdded: day('2019-01-15'),
            children: [
              { title: 'Japan Rail Pass', url: 'https://www.jrpass.com/', dateAdded: day('2019-01-15') },
              { title: 'Hyperdia', url: 'http://www.hyperdia.com/en/', dateAdded: day('2019-01-16') },
            ],
          },
        ],
      },
      {
        title: 'Cursos sin terminar',
        dateAdded: day('2020-09-01'),
        children: [
          { title: 'The Rust Programming Language', url: 'https://doc.rust-lang.org/book/', dateAdded: day('2020-09-01') },
          { title: 'A Tour of Go', url: 'https://go.dev/tour/', dateAdded: day('2021-02-14') },
        ],
      },
      {
        title: 'Complete Guide to Grid',
        url: 'https://css-tricks.com/snippets/css/complete-guide-grid',
        dateAdded: day('2014-07-22'),
      },
      { title: 'YouTube', url: 'https://www.youtube.com/', dateAdded: day('2014-06-01') },
    ],
    mobile: [
      { title: 'Google Maps', url: 'https://maps.google.com/', dateAdded: day('2016-05-20') },
      { title: 'Wikipedia', url: 'https://es.wikipedia.org/', dateAdded: day('2015-01-08') },
    ],
  }
}

// What `npm run dev` shows, since outside the extension there is no
// chrome.bookmarks. Applied changes last until the page reloads.
export function createDevBookmarks(): FakeBookmarks {
  return createFakeBookmarks(sample())
}
