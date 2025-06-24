import NeteasePlayer from '../components/neteasePlayer';
import {Suspense} from 'react';

export const metadata = {
  title: 'Rhapsody Player',
};

const Home = () => {
  return (
      <main className="min-h-screen bg-gray-100 flex flex-col">
        <Suspense>
          <NeteasePlayer/>
        </Suspense>
      </main>
  );
};

export default Home;