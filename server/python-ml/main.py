"""
FastAPI ML Service for Attendance Prediction
=============================================
Integrates with Supabase database and provides:
1. Logistic Regression for individual risk scoring
2. Prophet forecasting for aggregate trends
"""

import os
import json
from datetime import datetime, timedelta
from typing import List, Optional
from contextlib import asynccontextmanager

import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
from dotenv import load_dotenv

# ML imports
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

# Supabase
from supabase import create_client, Client

# Prophet (optional)
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False
    print("Warning: Prophet not installed. Forecasting will be limited.")

load_dotenv()

# ============================================================================
# Configuration
# ============================================================================
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
ML_PORT = int(os.getenv("ML_PORT", 8000))

# Global model storage
models = {
    "logistic_regression": None,
    "scaler": None,
    "prophet": None,
    "last_trained": None,
    "metrics": {}
}

# ============================================================================
# Pydantic Models
# ============================================================================
class TrainRequest(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class PredictRequest(BaseModel):
    start_date: str
    end_date: str
    limit: int = 10

class ForecastRequest(BaseModel):
    start_date: str
    end_date: str
    weeks: int = 4

class EmployeeRisk(BaseModel):
    staff_user_id: int
    staff_id: str
    name: str
    role: str
    department: str
    risk_score: float
    avg_late_30d: float
    total_ot_90d: float
    absence_count_60d: int
    recommendation: str

class ForecastPoint(BaseModel):
    week_starting: str
    predicted_rate: float
    lower_bound: float
    upper_bound: float

class FeatureImportance(BaseModel):
    feature: str
    coefficient: float
    impact: str

class TrainResponse(BaseModel):
    success: bool
    message: str
    metrics: dict
    feature_importance: List[FeatureImportance]

class PredictResponse(BaseModel):
    success: bool
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    employees: List[EmployeeRisk]

class ForecastResponse(BaseModel):
    success: bool
    forecast: List[ForecastPoint]
    historical_avg: float

class HealthResponse(BaseModel):
    status: str
    model_trained: bool
    last_trained: Optional[str]
    prophet_available: bool

# ============================================================================
# Database Connection - FIXED VERSION
# ============================================================================
def get_supabase() -> Client:
    """Create Supabase client with proper error handling"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(500, "Supabase credentials not configured")
    
    try:
        # ✅ FIXED: Create client with minimal options to avoid proxy error
        from supabase import create_client as _create_client
        client = _create_client(SUPABASE_URL, SUPABASE_KEY)
        return client
    except TypeError as e:
        # Handle proxy/init errors
        print(f"Supabase client creation error: {e}")
        print("Attempting fallback connection...")
        try:
            # Fallback: try older client syntax
            import httpx
            client = Client(SUPABASE_URL, SUPABASE_KEY)
            return client
        except Exception as e2:
            print(f"Fallback also failed: {e2}")
            raise HTTPException(500, f"Failed to connect to Supabase. Try: pip install supabase==2.3.0")
    except Exception as e:
        print(f"Supabase connection error: {e}")
        raise HTTPException(500, f"Failed to connect to Supabase: {str(e)}")

# ============================================================================
# Data Fetching
# ============================================================================
async def fetch_attendance_data(start: str = None, end: str = None) -> pd.DataFrame:
    """Fetch attendance data from Supabase"""
    try:
        db = get_supabase()
        
        # ✅ NEW FIX: Use limit/offset instead of range
        all_logs = []
        page_size = 1000
        offset = 0
        
        print(f"   Fetching attendance data from {start} to {end}...")
        
        while True:
            # Fetch attendance logs in batches using limit/offset
            query = db.table("attendance_logs").select(
                "staff_user_id, att_date, time_in, time_out, minute_late, overtime_hours, worked_hours, is_absent"
            )
            
            if start:
                query = query.gte("att_date", start)
            if end:
                query = query.lte("att_date", end)
            
            # ✅ Use limit + offset for pagination
            query = query.limit(page_size).offset(offset)
            
            try:
                logs_resp = query.execute()
            except Exception as e:
                print(f"   Query error at offset {offset}: {e}")
                break
            
            if not logs_resp.data or len(logs_resp.data) == 0:
                break
            
            batch_size = len(logs_resp.data)
            all_logs.extend(logs_resp.data)
            print(f"   Batch {offset // page_size + 1}: Fetched {batch_size} records (total: {len(all_logs)})")
            
            # If we got less than page_size, we've reached the end
            if batch_size < page_size:
                break
            
            offset += page_size
            
            # Safety limit: max 50,000 records
            if offset > 50000:
                print(f"   ⚠️ Reached safety limit of 50,000 records")
                break
        
        print(f"   ✅ Total fetched: {len(all_logs)} records")
        
        if not all_logs:
            return pd.DataFrame()
        
        # Fetch staff info
        staff_resp = db.table("staff_users").select(
            "id, staff_id, name, department, employee_type"
        ).execute()
        
        logs_df = pd.DataFrame(all_logs)
        staff_df = pd.DataFrame(staff_resp.data)
        
        # Merge
        df = logs_df.merge(
            staff_df, 
            left_on="staff_user_id", 
            right_on="id", 
            how="left",
            suffixes=("", "_staff")
        )

        # ✅ Use the is_absent column from database if available
        if "is_absent" in df.columns and df["is_absent"].notna().sum() > 0:
            df["is_absent"] = df["is_absent"].fillna(False).astype(int)
            print("   Using is_absent column from database")
        else:
            df["is_absent"] = df["time_in"].isna().astype(int)
            print("   Calculating is_absent from time_in")
        
        # Fill missing values
        df["minute_late"] = pd.to_numeric(df["minute_late"], errors="coerce").fillna(0)
        df["overtime_hours"] = pd.to_numeric(df["overtime_hours"], errors="coerce").fillna(0)
        
        # Determine role based on department (colleges = Faculty)
        COLLEGE_WHITELIST = {
            'CED - College of Education',
            'CCS - College of Computing Science',
            'CCJ - College of Criminal Justice',
            'CBPM - College of Business and Public Administration',
            'CAS - College of Arts and Sciences',
            'CHS - College of Health Sciences',
            'Gen Ed - General Education',
            'CL - College of Law',
            'NSTP - National Service Training Program'
        }
        df["role"] = df["department"].apply(
            lambda x: "Faculty" if x in COLLEGE_WHITELIST else "Staff"
        )
        
        df["att_date"] = pd.to_datetime(df["att_date"])
        
        # Print detailed stats
        print(f"\n✅ FINAL DATASET:")
        print(f"   - Total records: {len(df)}")
        print(f"   - Unique employees: {df['staff_user_id'].nunique()}")
        print(f"   - Present (time_in exists): {(~df['time_in'].isna()).sum()}")
        print(f"   - Absent (time_in NULL): {df['time_in'].isna().sum()}")
        print(f"   - is_absent=1: {df['is_absent'].sum()}")
        print(f"   - Date range: {df['att_date'].min()} to {df['att_date'].max()}\n")
        
        return df
        
    except Exception as e:
        print(f"Error fetching data: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Failed to fetch attendance data: {str(e)}")
# ============================================================================
# Feature Engineering
# ============================================================================
def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create lagged features for risk scoring"""
    df = df.sort_values(["staff_user_id", "att_date"]).copy()
    
    # Feature 1: AVG_LATE_30D
    df["AVG_LATE_30D"] = df.groupby("staff_user_id")["minute_late"].transform(
        lambda x: x.rolling(window=30, min_periods=1).mean()
    )
    
    # Feature 2: TOTAL_OT_90D
    df["TOTAL_OT_90D"] = df.groupby("staff_user_id")["overtime_hours"].transform(
        lambda x: x.rolling(window=90, min_periods=1).sum()
    )
    
    # Feature 3: ABSENCE_COUNT_60D
    df["ABSENCE_COUNT_60D"] = df.groupby("staff_user_id")["is_absent"].transform(
        lambda x: x.rolling(window=60, min_periods=1).sum()
    )
    
    return df

def generate_recommendation(row: pd.Series) -> str:
    """Generate prescriptive recommendations"""
    recommendations = []
    
    if row.get("TOTAL_OT_90D", 0) > 80:
        recommendations.append("Reduce Overtime")
    
    if row.get("AVG_LATE_30D", 0) > 15:
        recommendations.append("Punctuality Coaching")
    
    if row.get("ABSENCE_COUNT_60D", 0) >= 5:
        recommendations.append("Attendance Review")
    
    if not recommendations:
        recommendations.append("Monitor")
    
    return " | ".join(recommendations)

# ============================================================================
# Model Training
# ============================================================================
async def train_models(start: str = None, end: str = None) -> dict:
    """Train Logistic Regression and Prophet models"""
    global models
    
    print(f"Training models with data from {start} to {end}")
    
    # Fetch data
    df = await fetch_attendance_data(start, end)
    
    if df.empty or len(df) < 100:
        raise HTTPException(400, f"Insufficient data for training (got {len(df)} records, need at least 100)")
    
    # Engineer features
    df = engineer_features(df)
    
    # === LOGISTIC REGRESSION ===
    feature_cols = ["AVG_LATE_30D", "TOTAL_OT_90D", "ABSENCE_COUNT_60D"]
    X = df[feature_cols].fillna(0)
    y = df["is_absent"]
    
    # Check class balance
    print(f"Target distribution: Absent={y.sum()}, Present={len(y)-y.sum()}")
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    log_reg = LogisticRegression(
        class_weight="balanced",
        max_iter=1000,
        random_state=42
    )
    log_reg.fit(X_train_scaled, y_train)
    
    train_score = log_reg.score(X_train_scaled, y_train)
    test_score = log_reg.score(X_test_scaled, y_test)
    
    # Store models
    models["logistic_regression"] = log_reg
    models["scaler"] = scaler
    models["last_trained"] = datetime.now().isoformat()
    models["metrics"] = {
        "train_accuracy": round(train_score * 100, 1),
        "test_accuracy": round(test_score * 100, 1),
        "total_records": len(df),
        "unique_employees": df["staff_user_id"].nunique()
    }
    
    # Feature importance
    feature_importance = [
        {
            "feature": "Avg Late (30D)",
            "coefficient": round(log_reg.coef_[0][0], 4),
            "impact": "increases" if log_reg.coef_[0][0] > 0 else "decreases"
        },
        {
            "feature": "Total OT (90D)",
            "coefficient": round(log_reg.coef_[0][1], 4),
            "impact": "increases" if log_reg.coef_[0][1] > 0 else "decreases"
        },
        {
            "feature": "Absence Count (60D)",
            "coefficient": round(log_reg.coef_[0][2], 4),
            "impact": "increases" if log_reg.coef_[0][2] > 0 else "decreases"
        }
    ]
    
    print(f"Model trained: {test_score:.1%} accuracy on test set")
    
    # === PROPHET (if available) ===
# Around line 485-497, REPLACE the Prophet training section with this:
# === PROPHET (if available) ===
    if PROPHET_AVAILABLE:
        try:
            # ✅ FIX: Only aggregate weeks that have actual working days
            df["week"] = df["att_date"].dt.to_period("W").dt.start_time
            
            # Calculate weekly stats
            weekly = df.groupby("week").agg({
                "is_absent": ["sum", "count"]  # Total absent, total records
            }).reset_index()
            
            # Flatten column names
            weekly.columns = ["ds", "absent_count", "total_records"]
            
            # Calculate absence RATE (not raw count)
            weekly["y"] = weekly["absent_count"] / weekly["total_records"]
            
            # Keep only ds and y columns
            weekly = weekly[["ds", "y"]].copy()
            weekly["ds"] = pd.to_datetime(weekly["ds"])
            
            # ✅ Remove weeks with too few records (less than 5 days)
            weekly = weekly[weekly["y"].notna()]
            
            print(f"[Prophet] Weekly data points: {len(weekly)}")
            print(f"[Prophet] Average absence rate: {weekly['y'].mean():.1%}")
            
            if len(weekly) >= 10:
                prophet = Prophet(
                    weekly_seasonality=True,
                    yearly_seasonality=True,
                    seasonality_mode="multiplicative",
                    interval_width=0.95
                )
                prophet.fit(weekly)
                models["prophet"] = prophet
                print("[Prophet] ✅ Trained successfully")
            else:
                print(f"[Prophet] ⚠️ Only {len(weekly)} weeks, need 10+")
        except Exception as e:
            print(f"[Prophet] ❌ Failed: {e}")
            import traceback
            traceback.print_exc()
    
    return {
        "metrics": models["metrics"],
        "feature_importance": feature_importance
    }

# ============================================================================
# Prediction
# ============================================================================
async def get_risk_predictions(start: str, end: str, limit: int = 10) -> dict:
    """Get risk scores for employees"""
    global models
    
    if models["logistic_regression"] is None:
        raise HTTPException(400, "Model not trained. Call /train first.")
    
    # Fetch recent data
    df = await fetch_attendance_data(start, end)
    
    if df.empty:
        return {"employees": [], "counts": {"high": 0, "medium": 0, "low": 0}}
    
    # Engineer features
    df = engineer_features(df)
    
    # Get latest record per employee
    latest = df.groupby("staff_user_id").tail(1).copy()
    
    # Predict risk scores
    feature_cols = ["AVG_LATE_30D", "TOTAL_OT_90D", "ABSENCE_COUNT_60D"]
    X = latest[feature_cols].fillna(0)
    X_scaled = models["scaler"].transform(X)
    risk_scores = models["logistic_regression"].predict_proba(X_scaled)[:, 1]
    
    latest["risk_score"] = risk_scores
    latest["recommendation"] = latest.apply(generate_recommendation, axis=1)
    
    # Count by risk level
    high = (latest["risk_score"] > 0.5).sum()
    medium = ((latest["risk_score"] >= 0.3) & (latest["risk_score"] <= 0.5)).sum()
    low = (latest["risk_score"] < 0.3).sum()
    
    # Top N high risk
    top_risk = latest.nlargest(limit, "risk_score")
    
    employees = []
    for _, row in top_risk.iterrows():
        employees.append(EmployeeRisk(
            staff_user_id=int(row["staff_user_id"]),
            staff_id=str(row.get("staff_id", row["staff_user_id"])),
            name=str(row.get("name", "Unknown")),
            role=str(row.get("role", "Staff")),
            department=str(row.get("department", "Unknown")),
            risk_score=round(float(row["risk_score"]), 3),
            avg_late_30d=round(float(row.get("AVG_LATE_30D", 0)), 1),
            total_ot_90d=round(float(row.get("TOTAL_OT_90D", 0)), 1),
            absence_count_60d=int(row.get("ABSENCE_COUNT_60D", 0)),
            recommendation=str(row["recommendation"])
        ))
    
    return {
        "employees": employees,
        "counts": {"high": int(high), "medium": int(medium), "low": int(low)}
    }

# ============================================================================
# Forecasting
# ============================================================================
async def get_forecast(start: str, end: str, weeks: int = 4) -> dict:
    """Get absence rate forecast with historical data"""
    global models
    
    if not PROPHET_AVAILABLE:
        raise HTTPException(400, "Prophet not available")
    
    if models.get("prophet") is None:
        raise HTTPException(400, "Prophet model not trained. Call /train first.")
    
    try:
        # Generate forecast
        future = models["prophet"].make_future_dataframe(periods=weeks, freq="W")
        forecast = models["prophet"].predict(future)
        
        # ✅ NEW: Separate historical and future data
        historical = forecast.iloc[:-weeks]  # All except last N weeks
        future_forecast = forecast.tail(weeks)  # Last N weeks
        
        # Fetch actual historical data for comparison
        df = await fetch_attendance_data(start, end)
        
        if not df.empty:
            # Calculate actual weekly absence rates
            df["week"] = df["att_date"].dt.to_period("W").dt.start_time
            actual_weekly = df.groupby("week").agg({
                "is_absent": ["sum", "count"]
            }).reset_index()
            actual_weekly.columns = ["ds", "absent_count", "total_records"]
            actual_weekly["actual_rate"] = (actual_weekly["absent_count"] / actual_weekly["total_records"]) * 100
            actual_weekly["ds"] = pd.to_datetime(actual_weekly["ds"])
        else:
            actual_weekly = pd.DataFrame()
        
        # Build response with BOTH historical and forecast
        historical_avg = df["is_absent"].mean() if not df.empty else 0.15
        
        result = {
            "historical": [],  # ✅ NEW: Add historical data
            "forecast": []
        }
        
        # ✅ Add historical data points
        for _, row in historical.iterrows():
            result["historical"].append({
                "week_starting": row["ds"].strftime("%Y-%m-%d"),
                "predicted_rate": round(max(0, float(row["yhat"])) * 100, 1)
            })
        
        # Add forecast data points
        for _, row in future_forecast.iterrows():
            result["forecast"].append(ForecastPoint(
                week_starting=row["ds"].strftime("%Y-%m-%d"),
                predicted_rate=round(max(0, float(row["yhat"])) * 100, 1),
                lower_bound=round(max(0, float(row["yhat_lower"])) * 100, 1),
                upper_bound=round(max(0, float(row["yhat_upper"])) * 100, 1)
            ))
        
        return {
            "historical": result["historical"],
            "forecast": result["forecast"],
            "historical_avg": round(float(historical_avg) * 100, 1)
        }
        
    except Exception as e:
        print(f"[FORECAST] ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Forecast failed: {str(e)}")
# ============================================================================
# FastAPI App
# ============================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=== ML Service starting ===")
    print(f"   Prophet available: {PROPHET_AVAILABLE}")
    print(f"   Supabase configured: {bool(SUPABASE_URL)}")
    
    # ✅ AUTO-TRAIN on startup if model not trained
    if models["logistic_regression"] is None:
        print("\n🤖 Auto-training model on startup...")
        try:
            # Train with last 6 months of data
            from datetime import date
            end_date = date.today().isoformat()
            start_date = "2024-01-01" 
            
            result = await train_models(start_date, end_date)
            print(f"✅ Auto-training successful!")
            print(f"   - Accuracy: {result['metrics']['test_accuracy']}%")
            print(f"   - Records: {result['metrics']['total_records']}")
        except Exception as e:
            print(f"⚠️ Auto-training failed: {e}")
            print("   Model can still be trained manually via /api/ml/train")
    
    yield
    print("=== ML Service shutting down ===")

app = FastAPI(
    title="Attendance Prediction ML API",
    description="Machine Learning API for attendance risk scoring and forecasting",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/ml/health", response_model=HealthResponse)
async def health_check():
    """Check ML service health"""
    return HealthResponse(
        status="healthy",
        model_trained=models["logistic_regression"] is not None,
        last_trained=models["last_trained"],
        prophet_available=PROPHET_AVAILABLE
    )

@app.post("/api/ml/train", response_model=TrainResponse)
async def train_endpoint(request: TrainRequest = None):
    """Train ML models on attendance data"""
    try:
        start = request.start_date if request else None
        end = request.end_date if request else None
        
        result = await train_models(start, end)
        
        return TrainResponse(
            success=True,
            message="Models trained successfully",
            metrics=result["metrics"],
            feature_importance=[
                FeatureImportance(**fi) for fi in result["feature_importance"]
            ]
        )
    except Exception as e:
        print(f"Training error: {e}")
        raise HTTPException(500, f"Training failed: {str(e)}")

@app.post("/api/ml/predict", response_model=PredictResponse)
async def predict_endpoint(request: PredictRequest):
    """Get risk predictions for employees"""
    try:
        result = await get_risk_predictions(
            request.start_date,
            request.end_date,
            request.limit
        )
        
        return PredictResponse(
            success=True,
            high_risk_count=result["counts"]["high"],
            medium_risk_count=result["counts"]["medium"],
            low_risk_count=result["counts"]["low"],
            employees=result["employees"]
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Prediction error: {e}")
        raise HTTPException(500, f"Prediction failed: {str(e)}")

@app.post("/api/ml/forecast", response_model=ForecastResponse)
async def forecast_endpoint(request: ForecastRequest):
    """Get absence rate forecast"""
    try:
        result = await get_forecast(
            request.start_date,
            request.end_date,
            request.weeks
        )
        
        return ForecastResponse(
            success=True,
            forecast=result["forecast"],
            historical_avg=result["historical_avg"]
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Forecasting error: {e}")
        raise HTTPException(500, f"Forecasting failed: {str(e)}")

# ============================================================================
# Run Server
# ============================================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=ML_PORT)