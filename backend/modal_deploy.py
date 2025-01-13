# backend/modal_deploy.py
import modal
import asyncio
import sys

app = modal.App()

my_image = (
    modal.Image.debian_slim().pip_install([
        "gym",
        "numpy",
        "beautifulsoup4",
        "requests",
        "arcgis",
        "Flask",
        "python-dotenv"
    ])
    .add_local_dir(".", remote_path="/root/project")
)

@app.function(image=my_image)
def run_simulation():
    sys.path.append("/root/project")
    from simulation import FireMitigationEnv
    env = FireMitigationEnv()
    obs = env.reset()
    action = env.action_space.sample()
    state, reward, done, info = env.step(action)
    # Returning a structured result for the frontend
    return {
        "stations": env.fire_stations,
        "hydrants": env.hydrants[:10],  # Limit to first 10 for demo
        "wildfires": env.wildfires[:5],  # Limit to first 5 for demo
        "route": [
            {"lat": station["latitude"], "lng": station["longitude"]}
            for station in env.fire_stations
        ]
    }

async def main():
    async with app.run():
        result = await run_simulation.remote()
        print("Simulation result:", result)
        return result

if __name__ == "__main__":
    asyncio.run(main())
