// pages/index.tsx
import NeteasePlayer from '../components/neteasePlayer';

const Home = () => {
  return (
      <main className="min-h-screen bg-gray-100 flex flex-col">
        <NeteasePlayer />
      </main>
  );
};

export default Home;