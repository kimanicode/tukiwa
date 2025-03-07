import Image from "next/image";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import Testimonials from "./components/Testimonials";
import Why from "./components/Why";


export default function Page() {
  return (
    <div className=" ">
  
      <Home />      
      <Why />
      <Testimonials />

      
    </div>
  );
}
