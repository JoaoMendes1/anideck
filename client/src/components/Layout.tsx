import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="bg-ambient"></div>
      
      <Navbar />
      
      {/* pt-24 compensa a navbar superior. pb-24 compensa a BottomNav no mobile... */}
      <main className="relative z-10 flex-1 flex flex-col pt-24 pb-24 md:pb-0 w-full max-w-[100vw] overflow-x-hidden">
        <Outlet />
      </main>

      {/* A BottomNav tem a classe md:hidden internamente, então só renderiza no mobile */}
      <BottomNav />
    </div>
  )
}