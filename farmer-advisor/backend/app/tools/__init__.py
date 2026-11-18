from app.tools.escalation import escalate_to_extension_officer
from app.tools.guides import search_farming_guides
from app.tools.planting import get_planting_advice
from app.tools.prices import get_market_prices
from app.tools.profile import update_farmer_profile
from app.tools.soil import get_soil_profile
from app.tools.weather import get_weather
from app.tools.varieties import compare_crop_varieties

ALL_TOOLS = [
    get_weather,
    get_soil_profile,
    get_planting_advice,
    search_farming_guides,
    get_market_prices,
    update_farmer_profile,
    escalate_to_extension_officer,
    compare_crop_varieties,
]