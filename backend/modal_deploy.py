import modal
import asyncio
import sys

# Initialize the Modal App
app = modal.App()

# Define an image with necessary dependencies and mount the current directory
my_image = (
    modal.Image.debian_slim().pip_install([
        "gym",
        "numpy",
        "beautifulsoup4",
        "requests"
        # Add any additional dependencies here
    ])
    .add_local_dir(".", remote_path="/root/project")
)

@app.function(image=my_image)
def run_simulation():
    # Add the mounted directory to sys.path to import simulation module
    sys.path.append("/root/project")
    from simulation import FireMitigationEnv  # Now accessible due to mount and sys.path adjustment
    
    env = FireMitigationEnv()
    obs = env.reset()
    action = env.action_space.sample()
    new_state, reward, done, info = env.step(action)
    print(f"Action: {action}, Reward: {reward}")
    return new_state.tolist(), reward  # Convert numpy array to list for JSON serialization

async def main():
    async with app.run():
        # Call the function without await, as remote() returns a tuple directly in this context
        result = run_simulation.remote()
        print("Simulation result:", result)

if __name__ == "__main__":
    asyncio.run(main())
