import NeteasePlayer from '../components/neteasePlayer';

export const metadata = {
  title: 'Music Player',
};

const Home = () => {
  return (
      <main className="min-h-screen bg-gray-100 flex flex-col">
        <NeteasePlayer/>
      </main>
  );
};

export default Home;