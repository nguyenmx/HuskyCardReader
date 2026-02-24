import pandas as pd

df = pd.read_excel("student-test-data.xlsx")
df.to_csv("output.csv", index=False)
