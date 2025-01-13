# backend/simulation.py

import gym
from gym import spaces
import numpy as np

class FireMitigationEnv(gym.Env):
    def __init__(self):
        super(FireMitigationEnv, self).__init__()
        # Define action and observation space
        self.action_space = spaces.Discrete(2)  # Example action space
        self.observation_space = spaces.Box(low=0, high=1, shape=(1,), dtype=np.float32)

    def step(self, action):
        # Simplified simulation logic
        state = np.array([0.0])
        reward = 1.0 if action == 1 else 0.0
        done = True
        info = {}
        return state, reward, done, info

    def reset(self):
        return np.array([0.0])

if __name__ == "__main__":
    env = FireMitigationEnv()
    obs = env.reset()
    print("Initial observation:", obs)
